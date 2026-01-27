#!/usr/bin/env python
"""Remove all gift-related references from models.py"""

with open('api/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []

for i, line in enumerate(lines):
    # Skip lines with "gift" (case-insensitive)
    if 'gift' in line.lower() and ('Gift' in line or 'gift' in line.lower()):
        continue
    result_lines.append(line)

# Write back
with open('api/models.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print('Removed gift-related references from models.py')
