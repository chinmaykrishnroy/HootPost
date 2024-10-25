def hsl_to_hex(h, s, l):
    # Convert HSL to RGB
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs(((h / 60) % 2) - 1))
    m = l - c / 2

    if 0 <= h < 60:
        r, g, b = c, x, 0
    elif 60 <= h < 120:
        r, g, b = x, c, 0
    elif 120 <= h < 180:
        r, g, b = 0, c, x
    elif 180 <= h < 240:
        r, g, b = 0, x, c
    elif 240 <= h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x

    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)

    return f"#{r:02x}{g:02x}{b:02x}"

hue_color = 320

# Define the HSL values
colors_hsl = {
    "primary": {
        "DEFAULT": (hue_color, 0.89, 0.45),
        "100": (hue_color, 0.89, 0.50),
        "200": (hue_color, 0.89, 0.60),
    },
    "secondary": {
        "DEFAULT": (hue_color, 0.58, 0.94),
        "100": (hue_color, 0.56, 0.76),
        "200": (hue_color, 0.56, 0.70),
    },
    "black": {
        "DEFAULT": (hue_color, 0.10, 0.10),
        "100": (hue_color, 0.10, 0.05),
        "200": (hue_color, 0.10, 0.02),
    },
}

# Convert HSL to HEX
colors_hex = {key: {sub_key: hsl_to_hex(*value) for sub_key, value in sub_dict.items()} for key, sub_dict in colors_hsl.items()}
print(colors_hex)
