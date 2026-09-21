"""Dựng ảnh cho từng vị trí trên site, từ 21 khung studio gửi ngày 28.08.2026.

    python3 -m pip install pillow numpy
    python3 docs/thiet-ke/anh-studio/dung-anh.py --phuong-an a

Vì sao có script này thay vì sửa tay trong Photoshop: mỗi vị trí trên site cần
một khung khác nhau, một khung cắt khác nhau và một grade khác nhau. Ghi những
quyết định đó thành mã nguồn thì lần sau còn đọc lại được "vì sao ảnh này nằm
ở đây, vì sao cắt chỗ này" — một thư mục PNG thì không.

BỘ ẢNH GỐC CÓ HAI THẾ GIỚI ÁNH SÁNG, VÀ CHỈ MỘT DÙNG ĐƯỢC
  · Khung 01-09, 17: đèn huỳnh quang, ám xanh lá, nền lộn xộn (xe đẩy, bình
    xịt, thảm nhiều màu, gương phản chiếu), lại thêm logo cháy vào góc trên và
    dải chú thích ở đáy. Đây là ảnh kiểm kê thiết bị, không phải ảnh thương hiệu.
  · Khung 11-15, 19-21: người tập ngược sáng trước tường rèm voan. Cao sáng,
    sạch, có hình khối. Đây là thế giới dùng được.
Trộn hai thế giới vào cùng một trang là lý do lớn nhất khiến trang trông rẻ.

BA THỨ PHẢI BỎ Ở MỌI KHUNG CẮT
  1. Sàn gạch xám — luôn chiếm 15-25% đáy khung và không nói gì.
  2. Watermark — logo góc trên + dải chú thích (01-09), viên "J PILATES"
     (20, 21), dòng "Something new is coming" (21).
  3. Ám xanh lá của đèn huỳnh quang trong vùng tối.
"""

from __future__ import annotations

import argparse
import os
import re
import sys

try:
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:  # pragma: no cover
    sys.exit("Cần Pillow và numpy: python3 -m pip install pillow numpy")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEST = os.path.join(ROOT, "src_FE", "public", "photos")

#: Chất lượng AVIF. 70 không phải số tròn cho đẹp: đo PSNR của cả mười tệp
#: so với chính bản đã grade, q70 ngang WebP q88 (chênh dưới 0.4 dB ở mọi khung)
#: mà nhẹ hơn 29%. Hạ xuống q65 thì nhẹ hơn 45% nhưng mất nửa dB — không đổi,
#: vì mục đích của AVIF ở đây là GIỮ NGUYÊN chất lượng và bớt byte, không phải
#: bớt byte bằng cách bớt chất lượng. Số đo nằm trong tài liệu đối chiếu.
AVIF_Q = 70

#: #f2f0ea (--sand) chuẩn hoá quanh 1.0 — hướng mà bóng được kéo về.
SAND_HUE = np.array([1.010, 1.000, 0.972])


def _arr(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0


def _img(a: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def _lum(a: np.ndarray) -> np.ndarray:
    return (a * np.array([0.2126, 0.7152, 0.0722])).sum(axis=2, keepdims=True)


def grade(
    im: Image.Image,
    *,
    wb=0.70,
    denoise=(1.1, 4.0, 0.70),
    floor=0.018,
    contrast=0.28,
    sat=0.90,
    volume=(80, 0.24),
    bloom=0.10,
    warm_bg=(0.64, 0.85),
    sweep=(0.72, 0.70, 0.80),
    grain=0.011,
    tone=0.0,
) -> Image.Image:
    """Chín bước, theo đúng thứ tự này. Mỗi bước sửa một khuyết tật cụ thể của
    bộ ảnh gốc, và thứ tự không đổi được: làm mịn phải đứng TRƯỚC mọi phép tăng
    tương phản, nếu không tương phản sẽ nhân vân nén lên trước khi bị dập.

    Các con số dưới đây tìm ra bằng cách thử — chừng hai mươi vòng đối chiếu
    trên khung studio-13, xem ở đúng kích thước sẽ hiển thị trên trang chứ
    không xem phóng to. Ghi lại ở đây để lần sau khỏi dò lại từ đầu.
    """
    a = _arr(im)

    # 1. Cân trắng MỘT PHẦN theo rèm (percentile 99 là vật trắng chắc chắn có
    #    trong khung). Cân đủ 100% thì hết ám xanh lá nhưng da chuyển cam;
    #    0.70 là chỗ vừa bỏ được ám vừa giữ da đúng.
    ref = np.percentile(a.reshape(-1, 3), 99.0, axis=0)
    a = a * (1 + (ref.mean() / np.maximum(ref, 1e-4) - 1) * wb)

    # 2. Dập vân nén ở trung gian — tức là ở da. Tệp gốc đi qua Zalo nên có vân;
    #    không dập trước thì bước 5 và 6 sẽ biến vân thành vệt loang trên tay.
    if denoise:
        lr, cr, amt = denoise
        yy, cb, cr_ = im.convert("YCbCr").split() if False else _img(a).convert("YCbCr").split()
        soft = _arr(Image.merge("YCbCr", (
            yy.filter(ImageFilter.GaussianBlur(lr)),
            cb.filter(ImageFilter.GaussianBlur(cr)),
            cr_.filter(ImageFilter.GaussianBlur(cr)),
        )).convert("RGB"))
        l = _lum(a)
        m = np.clip((l - 0.18) / 0.68, 0, 1)
        m = (np.sin((m - 0.5) * np.pi) * 0.5 + 0.5) * amt
        a = np.clip(a * (1 - m) + soft * m, 0, 1)

    # 3. Neo điểm đen. Ảnh gốc không có điểm đen — vùng tối dừng ở xám nhạt nên
    #    mặt nào cũng đục. floor > 0 để bóng vẫn mở.
    lo = np.percentile(a, 0.5)
    a = floor + (1 - floor) * np.clip((a - lo) / max(1e-4, 1 - lo), 0, 1)

    # 4. Nén mềm phần trên 0.70, nhưng 1.0 vẫn ra 1.0 — giãn khoảng sáng để nếp
    #    rèm không dồn thành một mảng phẳng.
    x = a.copy(); m = x > 0.70
    t = (x[m] - 0.70) / 0.30
    x[m] = 0.70 + 0.30 * np.tanh(t * 1.7) / np.tanh(1.7)
    a = np.clip(x, 0, 1)

    # 5. S-curve quanh trung gian, không đụng hai đầu.
    a = np.clip(a + contrast * (a - 0.5) * (1 - np.abs(a - 0.5) * 2), 0, 1)

    # 6. Ngả bóng về sắc cát (tone=0 là tắt). Nền trang là #f2f0ea; ảnh lạnh hơn
    #    nền thì luôn trông như dán vào. Sau khi đã cân trắng một phần thì
    #    thường không cần thêm nữa, nên mặc định tắt.
    if tone:
        l = _lum(a)
        a = np.clip(a * (1 + (SAND_HUE - 1) * (tone * (1 - l) ** 2 + 0.24 * l ** 3)), 0, 1)

    # 7. Hạ bão hoà nhẹ. Đệm vinyl và tường bạc hà trong phòng này quá tươi so
    #    với bảng màu cát/mực.
    l = _lum(a); a = np.clip(l + (a - l) * sat, 0, 1)

    # 8. Tương phản cục bộ BÁN KÍNH LỚN, chỉ trên độ sáng, chừa vùng sáng.
    #    Bán kính nhỏ (kiểu "clarity") tạo viền quanh cánh tay trên nền rèm
    #    trắng — đó là vệt HDR và nó trông rẻ. Bán kính lớn thêm khối mà không
    #    để lại viền.
    if volume:
        r, amt = volume
        l = _lum(a)
        lb = np.asarray(_img(np.repeat(l, 3, axis=2)).filter(ImageFilter.GaussianBlur(r)),
                        dtype=np.float32)[:, :, :1] / 255.0
        w = np.clip((0.78 - l) / 0.78, 0, 1) ** 0.6
        a = np.clip(a + (l - lb) * amt * w, 0, 1)

    # 9. Loang sáng nhẹ quanh vùng chói — thứ làm ảnh ngược sáng đọc ra như
    #    chụp phim chứ không như chụp điện thoại. Quá tay thì ảnh mờ như sương.
    if bloom:
        l = _lum(a)
        mask = np.clip((l - 0.80) / 0.20, 0, 1)
        gl = _arr(_img(np.repeat(mask, 3, axis=2)).filter(ImageFilter.GaussianBlur(26)))
        a = np.clip(1 - (1 - a) * (1 - gl * bloom), 0, 1)

    # 10. Rút màu ở những mảng SÁNG và NGẢ VÀNG. Tường rèm không đồng màu: có
    #     một dải bắt nắng ngả be nằm giữa những dải trắng và nó đọc ra như vệt
    #     ố. Ngưỡng đặt trên da nên da không bị đụng.
    if warm_bg:
        th, amt = warm_bg
        l = _lum(a); mx = a.max(axis=2, keepdims=True); mn = a.min(axis=2, keepdims=True)
        s = (mx - mn) / np.maximum(mx, 1e-4)
        warm = np.clip((a[..., 0:1] - a[..., 2:3]) / np.maximum(mx, 1e-4) * 6, 0, 1)
        m = np.clip((l - th) / max(1e-4, 1 - th), 0, 1) * warm * np.clip(s * 4, 0, 1) * amt
        a = np.clip(a + (l - a) * m, 0, 1)

    # 11. Làm sạch hậu cảnh: vùng đã sáng thì đẩy về trắng và rút màu. Rèm voan
    #     trong ảnh gốc không trắng — nó có mảng be, mảng xám xanh và vệt nén.
    if sweep:
        th, push, desat = sweep
        l = _lum(a)
        m = np.clip((l - th) / 0.18, 0, 1); m = m * m * (3 - 2 * m)
        a = a * (1 - desat * m) + (l * np.ones_like(a)) * (desat * m)
        a = np.clip(a + (1 - a) * m * push, 0, 1)

    # 12. Hạt. Vừa che vân nén còn sót, vừa chặn hiện tượng dải màu (banding)
    #     trên mảng rèm lớn sau khi WebP nén lần nữa.
    if grain:
        rng = np.random.default_rng(7)
        n = rng.normal(0, 1, a.shape[:2]).astype(np.float32)
        w = (1 - np.abs(_lum(a)[..., 0] - 0.5) * 2) ** 0.7
        a = np.clip(a + (n * w * grain)[..., None], 0, 1)

    return _img(a)


class Cut:
    """Một quyết định cho một vị trí: lấy khung nào, cắt ở đâu, grade thế nào."""

    def __init__(self, frame, box, ratio, widths, why, *, drops="", **g):
        self.frame, self.box, self.ratio, self.widths = frame, box, ratio, widths
        self.why, self.drops, self.g = why, drops, g

    def render(self, slot: str) -> Image.Image:
        im = Image.open(os.path.join(HERE, f"studio-{self.frame}.jpg")).convert("RGB")
        W, H = im.size
        l, t, r, b = self.box[0] * W, self.box[1] * H, self.box[2] * W, self.box[3] * H
        cw, ch = r - l, b - t
        # Ép về đúng tỉ lệ bằng cách CO khung lại, không bao giờ nới ra: mép đã
        # chọn là mép để tránh watermark, nới ra là watermark quay lại.
        if cw / ch > self.ratio:
            over = (cw - ch * self.ratio) / 2
            l, r = l + over, r - over
        else:
            over = (ch - cw / self.ratio) / 2
            t, b = t + over, b - over
        out = grade(im.crop((round(l), round(t), round(r), round(b))), **self.g)
        # Không phóng to quá kích thước thật: một tệp 1072px dựng từ 1043px chỉ
        # là một lời nói dối về độ nét, và nó nặng hơn bản thật.
        for w in self.widths:
            assert w <= out.width, f"{slot}: {w}px vượt {out.width}px thật"
            small = out.resize((w, round(w / self.ratio)), Image.LANCZOS)
            small.save(os.path.join(DEST, f"{slot}-{w}.webp"), "WEBP", quality=88, method=6)
            small.save(os.path.join(DEST, f"{slot}-{w}.avif"), "AVIF", quality=AVIF_Q, speed=2)
        return out


# ── PHƯƠNG ÁN A — "Ánh sáng" ────────────────────────────────────────────────
# Chỉ lấy thế giới ngược sáng. Ảnh để lớn, không viền, không hiệu ứng: khi khung
# đã đúng thì thứ duy nhất còn phải làm là cho nó chỗ thở.
A = {
    "hero": Cut(
        "13", (0.20, 0.00, 0.83, 0.80), 4 / 5, [321, 643],
        why="Cả người lẫn kiến trúc trong một khung: lồng thép của Cadillac dựng "
            "khung hình, người treo trong đó, rèm sáng phía sau. Hero cần một "
            "hình học, không cần một danh mục thiết bị.",
        drops="Sàn gạch VÀ dải diềm trắng dưới chân bàn. Khung dừng ở thân bàn, "
              "nên đáy là một đường ngang sạch.\n"
              "Giá: chiều cao cắt đi kéo bề rộng xuống còn 643px — vừa đủ 1:1 ở "
              "màn hình thường, hơi mềm trên retina. Đây là trần của bộ ảnh gốc "
              "(1280px cạnh dài), không phải của khung cắt.",
    ),
    "method": Cut(
        "12", (0.00, 0.00, 1.00, 0.97), 4 / 5, [377, 754],
        why="Một cử động ở biên độ đầy đủ — đúng nghĩa 'môn học về sự chính xác'. "
            "Khung dọc vì chính cái vươn lên là nội dung; cắt vuông là cụt tay.",
        drops="Dải sàn ở đáy.",
    ),
    "room": Cut(
        "20", (0.10, 0.04, 0.96, 0.855), 1 / 1, [521, 1043],
        why="Thiết bị đứng một mình trước rèm sáng: gỗ, đệm, thang. Đây là ô "
            "'vật liệu thật' — nó cần một vật, không cần một căn phòng.",
        drops="Viên watermark 'J PILATES' ở đáy, phần lớn sàn.",
        wb=0.55,
    ),
    "practice": Cut(
        "15", (0.04, 0.16, 0.68, 0.80), 16 / 10, [409, 819],
        why="Một buổi tập trông như thế nào: người giữ tư thế trên reformer, "
            "đường ray chạy ngang khung.",
        drops="Một phần ba bên phải — tháp, barrel, dây đai chồng lên nhau.",
    ),
    "welcome": Cut(
        "11", (0.00, 0.00, 1.00, 0.96), 3 / 4, [330, 660],
        why="Ô dọc cao của trang đăng nhập có khung riêng, không mượn ô vuông "
            "'room' rồi để object-cover xén bừa.",
        drops="Dải sàn ở đáy.",
    ),
    # Không có 'city'. Xem ghi chú ở cuối tệp.
}

# ── PHƯƠNG ÁN G3 — "Một khung" ──────────────────────────────────────────────
# Trang chủ mang ĐÚNG MỘT bức ảnh. Lý do không phải thẩm mỹ tối giản, mà là ba
# phép đo đã có sẵn trong chính dự án này:
#
#   1. Sáu khung dùng được đều từ một buổi chụp, một người, một bức tường rèm.
#      Bày ba tấm cạnh nhau thì người xem đọc ra "một bộ ảnh mỏng bị kéo dài".
#      Bày một tấm thì không có gì để so, và sự đơn điệu thôi hiện ra.
#   2. Khung hero của phương án A cắt dọc 4/5 từ studio-13 — vốn là khung NGANG
#      1280x1005. Ép khung ngang vào ô dọc là chỗ mất độ phân giải: còn 643px,
#      và chính tài liệu A ghi "hơi mềm trên retina". Trả nó về chiều ngang tự
#      nhiên thì được 1088px, hơn 69% chiều dài cạnh.
#   3. Trần 1280px của bộ ảnh quyết định luôn bề rộng trình bày. Ảnh 1088px
#      kéo tràn màn hình 1440px là phóng to 1.3 lần — đúng thứ Cut.render từ
#      chối làm khi ghi tệp. Nên ảnh KHÔNG tràn viền: nó dừng ở đúng 1088px.
#      Cái lề còn lại không phải trang trí, nó là trần độ phân giải nhìn thấy
#      được — và một tấm ảnh dừng trước mép trang đọc ra là được CHỌN, không
#      phải được lấp vào.
G3 = dict(A)
G3["hero"] = Cut(
    "13", (0.07, 0.00, 0.92, 0.82), 4 / 3, [544, 1088],
    why="Cùng khung với phương án A, trả về chiều ngang vốn có của nó. Khung "
        "thép của Cadillac dựng thành một hình chữ nhật, người treo bên trong, "
        "rèm sáng phía sau — hình học đủ mạnh để một mình gánh cả trang chủ.",
    drops="Dải tường xám ở mép trái, sàn gạch. Đáy dừng ở thân bàn nên mép dưới "
          "là một đường ngang sạch.\n"
          "Được: 1088px thay vì 643px. Đổi lại, khung này nói về căn phòng và "
          "về sự kiểm soát, không nói về một lớp nhóm nhỏ cho người mới — phần "
          "đó nay do chữ gánh, vì không còn tấm thứ hai để gánh hộ.",
)

OPTIONS = {"a": A, "g3": G3}


def kiem_tra_khop() -> int:
    """Mọi đường dẫn ảnh trong `photography.ts` phải trỏ vào một tệp có thật.

    Đổi khung cắt thì bề rộng tệp đổi theo, và rất dễ quên sửa `srcSet`. Lần
    trước quên đúng một dòng và ô hero trên trang chủ hiện ra chữ alt.
    """
    brief = os.path.join(ROOT, "src_FE", "app", "content", "photography.ts")
    if not os.path.exists(brief):
        return 0
    text = open(brief, encoding="utf-8").read()
    want = set(re.findall(r"/photos/([a-z]+-\d+\.(?:webp|avif))", text))
    have = set(os.listdir(DEST)) if os.path.isdir(DEST) else set()
    missing, extra = sorted(want - have), sorted(have - want)
    for m in missing:
        print(f"  THIẾU  {m} — photography.ts trỏ vào nhưng không có tệp", file=sys.stderr)
    for e in extra:
        print(f"  THỪA   {e} — có tệp nhưng không ai dùng", file=sys.stderr)
    return 1 if missing else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--phuong-an", default="a", choices=sorted(OPTIONS))
    args = ap.parse_args()
    os.makedirs(DEST, exist_ok=True)
    tong = {"webp": 0, "avif": 0}
    for slot, cut in OPTIONS[args.phuong_an].items():
        im = cut.render(slot)
        for w in cut.widths:
            for ext in tong:
                tong[ext] += os.path.getsize(os.path.join(DEST, f"{slot}-{w}.{ext}"))
        print(f"{slot:9} ← studio-{cut.frame}  {im.size[0]}x{im.size[1]}  ({', '.join(map(str, cut.widths))})")
    giam = (1 - tong["avif"] / tong["webp"]) * 100
    print(f"\nWebP q88 {tong['webp'] / 1024:6.1f} kB   "
          f"AVIF q{AVIF_Q} {tong['avif'] / 1024:6.1f} kB   nhẹ hơn {giam:.0f}%")
    return kiem_tra_khop()


if __name__ == "__main__":
    raise SystemExit(main())

# ── VÌ SAO KHÔNG CÒN Ô 'city' ───────────────────────────────────────────────
# Ô đó là một dải 21/9 tràn viền, đặt ngay trước khối kết màu mực. Trong 21
# khung không có khung nào làm được việc của nó: mọi khung rộng ≥1280px đều là
# một CẢNH (dãy reformer, người tập, thiết bị), không phải một CHẤT LIỆU. Cắt
# một dải ra khỏi cảnh thì được một lát cắt trông như lỗi hiển thị — bản cũ
# dùng dải rèm 660px kéo tràn màn hình, và nó đúng là trông như vậy.
# Bỏ hẳn ô đó. Một vị trí không có ảnh nào nói được điều gì thì bỏ đi, đừng lấp.
