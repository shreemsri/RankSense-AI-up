import pdfplumber

def test_resume(pdf_path):
    full_text = ""
    hyperlinks = []
    with pdfplumber.open(pdf_path) as pdf:
        full_text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        for page in pdf.pages:
            if page.hyperlinks:
                for hl in page.hyperlinks:
                    if hl.get('uri'):
                        hyperlinks.append(hl['uri'])
    
    if hyperlinks:
        full_text += "\n" + "\n".join(hyperlinks)
        
    print("----- EXTRACTED TEXT START -----")
    print(full_text)
    print("----- EXTRACTED TEXT END -----")

test_resume("resume (1).pdf")
