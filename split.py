import os

input_file = "e:/IDP/files/index.html"
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

style_lines = lines[14:1143]
app_lines = lines[1407:2415]

with open("e:/IDP/files/style.css", 'w', encoding='utf-8') as f:
    f.writelines(style_lines)

with open("e:/IDP/files/app.js", 'w', encoding='utf-8') as f:
    f.writelines(app_lines)

print("Split successful!")
