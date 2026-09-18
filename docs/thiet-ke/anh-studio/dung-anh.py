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
import sys

try:
    import numpy as np
    from PIL import Image, ImageEnhance
except ImportError:  # pragma: no cover
    sys.exit("Cần Pillow và numpy: python3 -m pip install pillow numpy")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEST = os.path.join(ROOT, "src_FE", "public", "photos")

#: #f2f0ea (--sand) chuẩn hoá quanh 1.0 — hướng mà bóng được kéo về.
SAND_HUE = np.array([1.010, 1.000, 0.972])


def _arr(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0


def _img(a: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def grade(im: Image.Image, *, wb=99.0, bp=0.5, floor=0.035, k=0.22, sat=0.96) -> Image.Image:
    """Bốn bước, theo thứ tự này.

    1. Cân trắng theo rèm. Rèm voan ngược sáng là vật trắng duy nhất chắc chắn
       có trong khung; ghim nó về trung tính là cách bỏ ám xanh lá mà không phải
       đoán nhiệt độ màu.
    2. Neo điểm đen. Ảnh gốc không có điểm đen — vùng tối dừng ở xám nhạt, nên
       mặt nào cũng đục. `floor` > 0 để bóng vẫn mở: bết đen là kiểu "cinematic"
       rẻ tiền, và nó giết luôn nếp rèm.
    3. S-curve nhẹ quanh trung gian, không đụng hai đầu, nên highlight của rèm
       không bị chặn thành mảng trắng phẳng.
    4. Ngả bóng về sắc cát. Nền trang là #f2f0ea; ảnh lạnh hơn nền thì luôn
       trông như dán vào chứ không thuộc về trang.

    Tham số để mở cho từng khung, không phải để dùng chung: `wb` phải hạ xuống
    ở khung 20 vì rèm ở đó đã ngả ấm sẵn, lấy percentile 99 sẽ đẩy cả ảnh sang
    vàng. Một bộ số cho cả bộ ảnh là định nghĩa của "phủ filter".
    """
    a = _arr(im)
    ref = np.percentile(a.reshape(-1, 3), wb, axis=0)
    a = a * (ref.mean() / np.maximum(ref, 1e-4))
    lo = np.percentile(a, bp)
    a = floor + (1 - floor) * np.clip((a - lo) / max(1e-4, 1 - lo), 0, 1)
    a = np.clip(a + k * (a - 0.5) * (1 - np.abs(a - 0.5) * 2), 0, 1)
    lum = a.mean(axis=2, keepdims=True)
    a = np.clip(a * (1 + (SAND_HUE - 1) * (0.9 * (1 - lum) ** 2 + 0.24 * lum**3)), 0, 1)
    return ImageEnhance.Color(_img(a)).enhance(sat)


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
            path = os.path.join(DEST, f"{slot}-{w}.webp")
            out.resize((w, round(w / self.ratio)), Image.LANCZOS).save(
                path, "WEBP", quality=88, method=6
            )
        return out


# ── PHƯƠNG ÁN A — "Ánh sáng" ────────────────────────────────────────────────
# Chỉ lấy thế giới ngược sáng. Ảnh để lớn, không viền, không hiệu ứng: khi khung
# đã đúng thì thứ duy nhất còn phải làm là cho nó chỗ thở.
A = {
    "hero": Cut(
        "13", (0.25, 0.00, 0.90, 0.93), 4 / 5, [374, 748],
        why="Cả người lẫn kiến trúc trong một khung: lồng thép của Cadillac dựng "
            "khung hình, người treo trong đó, rèm sáng phía sau. Hero cần một "
            "hình học, không cần một danh mục thiết bị.",
        drops="Sàn gạch ở đáy, mảng tường thừa bên trái.",
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
        wb=97.0,
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

OPTIONS = {"a": A}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--phuong-an", default="a", choices=sorted(OPTIONS))
    args = ap.parse_args()
    os.makedirs(DEST, exist_ok=True)
    for slot, cut in OPTIONS[args.phuong_an].items():
        im = cut.render(slot)
        print(f"{slot:9} ← studio-{cut.frame}  {im.size[0]}x{im.size[1]}  ({', '.join(map(str, cut.widths))})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# ── VÌ SAO KHÔNG CÒN Ô 'city' ───────────────────────────────────────────────
# Ô đó là một dải 21/9 tràn viền, đặt ngay trước khối kết màu mực. Trong 21
# khung không có khung nào làm được việc của nó: mọi khung rộng ≥1280px đều là
# một CẢNH (dãy reformer, người tập, thiết bị), không phải một CHẤT LIỆU. Cắt
# một dải ra khỏi cảnh thì được một lát cắt trông như lỗi hiển thị — bản cũ
# dùng dải rèm 660px kéo tràn màn hình, và nó đúng là trông như vậy.
# Bỏ hẳn ô đó. Một vị trí không có ảnh nào nói được điều gì thì bỏ đi, đừng lấp.
