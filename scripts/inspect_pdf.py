import fitz # PyMuPDF
import os

pdf_path = r"C:\Users\احمد منصور\.gemini\antigravity\brain\82e1cf6b-533a-4130-8dc1-c60b4acf8a58\.user_uploaded\media_1792259443580_db58ef9b.pdf"
out_dir = r"d:\قانوني 7\scripts\pdf_inspect"
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
print("Page count:", len(doc))

for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    img_path = os.path.join(out_dir, f"page_{i+1}.png")
    pix.save(img_path)
    print(f"Saved {img_path}")
    
    text = page.get_text("text")
    txt_path = os.path.join(out_dir, f"page_{i+1}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Page {i+1} text length: {len(text)}")
