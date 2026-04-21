from PIL import Image
import base64
import io

img = Image.open('C:/SOLICITUDES-ACADEMICAS-2/frontend/assets/img/logo-cul.jpg')
img_small = img.resize((120, 120), Image.LANCZOS)

buf = io.BytesIO()
img_small.save(buf, format='PNG', optimize=True)
png_data = buf.getvalue()
b64 = base64.b64encode(png_data).decode()

chunk_size = 4000
parts = []
for i in range(0, len(b64), chunk_size):
    parts.append(b64[i:i+chunk_size])

lines = []
lines.append('// Logo CUL en base64 (120x120 PNG) - NO MODIFICAR')
lines.append('var LOGO_CUL_BASE64 = "' + parts[0] + '"')
for p in parts[1:]:
    lines.append('    + "' + p + '"')
lines[-1] = lines[-1] + ';'

content = '\n'.join(lines) + '\n'

with open('C:/SOLICITUDES-ACADEMICAS-2/frontend/js/reportes-logo.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK, base64 length:', len(b64))
print('Lines:', len(lines))