import cv2
import numpy as np
import os

class SignVisualizer:
    def __init__(self):
        # Look for sign images in these folders relative to where app.py is
        self.possible_dirs = [
            "asl_images",
            "signs",
            "letters",
            "images",
            os.path.join("backend", "asl_images"),
            os.path.join("backend", "signs"),
            os.path.join("backend", "images"),
        ]
        self.image_dir = None
        for d in self.possible_dirs:
            if os.path.isdir(d):
                self.image_dir = d
                break

        # Cache loaded images
        self._cache = {}

    def image_dir_status(self):
        if self.image_dir:
            files = [f for f in os.listdir(self.image_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
            return f"✅ Sign images found in '{self.image_dir}' ({len(files)} images)"
        else:
            return (
                "⚠️ No sign image folder found. Create a folder called 'asl_images' "
                "next to app.py and add letter images named A.png, B.png, etc."
            )

    def _find_image_path(self, token: str):
        if not self.image_dir:
            return None
        # Try common naming patterns
        candidates = [
            f"{token}.png",
            f"{token}.jpg",
            f"{token}.jpeg",
            f"{token.lower()}.png",
            f"{token.lower()}.jpg",
            f"{token.upper()}.png",
            f"{token.upper()}.jpg",
        ]
        for name in candidates:
            path = os.path.join(self.image_dir, name)
            if os.path.isfile(path):
                return path
        return None

    def is_known_sign(self, token: str) -> bool:
        if token == "SPACE":
            return True
        return self._find_image_path(token) is not None

    def create_sign_image(self, token: str, width: int = 200, height: int = 200):
        """Returns a BGR numpy image for the given token."""
        if token in self._cache:
            return self._cache[token]

        # Background color
        bg = np.full((height, width, 3), (22, 27, 39), dtype=np.uint8)

        if token == "SPACE":
            img = bg.copy()
            cv2.putText(img, "SPACE", (20, height // 2 + 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (107, 114, 128), 2, cv2.LINE_AA)
            self._cache[token] = img
            return img

        path = self._find_image_path(token)
        if path:
            loaded = cv2.imread(path)
            if loaded is not None:
                img = cv2.resize(loaded, (width, height))
                self._cache[token] = img
                return img

        # Fallback: draw the letter as text
        img = bg.copy()
        font = cv2.FONT_HERSHEY_SIMPLEX
        text = token if len(token) == 1 else token[:2]
        scale = 3.0 if len(text) == 1 else 1.5
        thickness = 4
        (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
        x = (width - tw) // 2
        y = (height + th) // 2
        cv2.putText(img, text, (x, y), font, scale, (167, 139, 250), thickness, cv2.LINE_AA)
        # Border
        cv2.rectangle(img, (4, 4), (width - 5, height - 5), (46, 44, 80), 2)

        self._cache[token] = img
        return img
