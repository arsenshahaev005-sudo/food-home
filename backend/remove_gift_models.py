#!/usr/bin/env python
"""Remove all gift-related models from models.py"""

gift_models = [
    'GiftProduct',
    'GiftOrder',
    'GiftPayment',
    'GiftActivationAttempt',
    'GiftActivationIdempotency',
    'GiftCreateIdempotency',
    'RefundOperation',
]

with open('api/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []
skip_until_next_class = False

for i, line in enumerate(lines):
    # Check if this line starts a gift model
    if line.strip().startswith('class '):
        class_name = line.strip().split('(')[0].replace('class ', '')
        if class_name in gift_models:
            skip_until_next_class = True
            continue
    
    # Skip lines until we find the next model (not gift-related)
    if skip_until_next_class:
        if line.strip().startswith('class '):
            # Check if this is another gift model
            class_name = line.strip().split('(')[0].replace('class ', '')
            if class_name in gift_models:
                continue
            else:
                skip_until_next_class = False
                result_lines.append(line)
        continue
    
    # If we're not in a gift model, keep line
    if not skip_until_next_class:
        result_lines.append(line)

# Write back
with open('api/models.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print(f'Removed {len(gift_models)} gift models')
