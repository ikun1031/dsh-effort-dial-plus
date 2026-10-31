from PIL import Image, ImageDraw

W = H = 180
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Rounded dark card
d.rounded_rectangle((4, 4, W - 4, H - 4), radius=42, fill=(36, 36, 36, 255))

# Rail: horizontal blue -> purple gradient
x0, x1 = 24, 156
y0, y1 = 112, 144
stops = [(0.0, (47, 79, 203)), (0.5, (171, 119, 255)), (1.0, (109, 84, 200))]
for x in range(x0, x1 + 1):
    t = (x - x0) / (x1 - x0)
    for i in range(len(stops) - 1):
        a_t, a_c = stops[i]
        b_t, b_c = stops[i + 1]
        if a_t <= t <= b_t:
            k = 0 if b_t == a_t else (t - a_t) / (b_t - a_t)
            c = tuple(round(a_c[j] + (b_c[j] - a_c[j]) * k) for j in range(3))
            d.line([(x, y0), (x, y1)], fill=c + (255,))
            break

# Rounded ends for the rail
d.rounded_rectangle((x0, y0, x1, y1), radius=16, outline=None, fill=None)

# Thumb
d.ellipse((x1 - 16, y0 + 0, x1 + 16, y1 + 0), fill=(255, 255, 255, 255))

# Bolt glyph
bolt = [
    (96, 30), (70, 80), (86, 80), (82, 112), (110, 62), (93, 62), (96, 30),
]
d.polygon(bolt, fill=(176, 109, 255, 255))

img.save(
    r"C:\Users\ｌｉ\Documents\deepseek-harness\default-workspace\dsh-effort-dial-plus\assets\icon-180.png"
)
print("saved")
