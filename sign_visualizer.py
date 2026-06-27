import cv2
import numpy as np
import json
import os

# ── Edit this to match your actual folder name if different ───────────────────
IMAGE_DIRS = ["asl_images", "signs", "sign_images", "asl_signs"]

class SignVisualizer:
    """Loads real ASL letter photos and serves them for Text-to-Sign display."""

    def __init__(self):
        try:
            with open("sawa_label_classes.json", "r") as f:
                self.labels = json.load(f)
        except FileNotFoundError:
            self.labels = [chr(i) for i in range(65, 91)] + ["space", "del"]

        self.image_dir = self._find_image_dir()
        self._cache = {}

    def _find_image_dir(self):
        for d in IMAGE_DIRS:
            if os.path.isdir(d):
                return d
        return None

    def _load_image(self, letter):
        if self.image_dir is None:
            return None
        for name in [letter.upper(), letter.lower(), letter]:
            path = os.path.join(self.image_dir, f"{name}.jpg")
            if os.path.isfile(path):
                img = cv2.imread(path)
                if img is not None:
                    return img
        return None

    def _fallback_image(self, letter, width=200, height=200):
        img = np.ones((height, width, 3), dtype=np.uint8) * 25
        cv2.rectangle(img, (2, 2), (width - 2, height - 2), (42, 51, 61), 2)
        if letter == "SPACE":
            text, color = "SPC", (107, 114, 128)
        elif letter in ("DEL", "DELETE"):
            text, color = "DEL", (239, 68, 68)
        else:
            text, color = letter.upper(), (167, 139, 250)
        font = cv2.FONT_HERSHEY_DUPLEX
        scale = 2.5 if len(text) == 1 else 1.0
        thick = 3
        (tw, th), _ = cv2.getTextSize(text, font, scale, thick)
        cv2.putText(img, text, ((width - tw) // 2, (height + th) // 2),
                    font, scale, color, thick, cv2.LINE_AA)
        cv2.putText(img, "no image", (6, height - 8),
                    cv2.FONT_HERSHEY_PLAIN, 0.9, (75, 85, 99), 1, cv2.LINE_AA)
        return img

    def create_sign_image(self, letter, width=200, height=200):
        key = letter.upper()
        if key in self._cache:
            return self._cache[key]
        img = self._load_image(letter)
        if img is not None:
            img = cv2.resize(img, (width, height), interpolation=cv2.INTER_AREA)
        else:
            img = self._fallback_image(letter, width, height)
        self._cache[key] = img
        return img

    def is_known_sign(self, letter):
        in_labels = letter.upper() in [l.upper() for l in self.labels]
        has_image = self._load_image(letter) is not None
        return in_labels and has_image

    def get_all_signs(self):
        return sorted(self.labels)

    def image_dir_status(self):
        if self.image_dir:
            files = [f for f in os.listdir(self.image_dir) if f.lower().endswith(".jpg")]
            return f"✅ Found `{self.image_dir}/` — {len(files)} .jpg files"
        return f"❌ No image folder found. Searched: {IMAGE_DIRS}"