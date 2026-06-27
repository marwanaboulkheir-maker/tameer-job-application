import fitz
import pytesseract
from PIL import Image

src = r"C:\Users\Marwan Mohamet\OneDrive\Desktop\تقديم-Marwan Mohamed-2026-06-03.pdf"
out = r"C:\Users\Marwan Mohamet\OneDrive\Desktop\تقديم-Marwan Mohamed-2026-06-03-ocr-fixed.pdf"

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

doc = fitz.open(src)
ocr_doc = fitz.open()

for page in doc:
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    text = pytesseract.image_to_string(img, lang="ara+eng", config="--psm 6")
    new_page = ocr_doc.new_page(width=page.rect.width, height=page.rect.height)
    new_page.insert_textbox(
        page.rect,
        text if text.strip() else "[OCR EMPTY PAGE]",
        fontsize=12,
        fontname="helv",
        align=0
    )

ocr_doc.save(out, garbage=4, deflate=True)
print(out)
