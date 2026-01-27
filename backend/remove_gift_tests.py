#!/usr/bin/env python
"""Remove all gift-related test classes from tests.py"""

gift_classes = [
    'PublicGiftFlowTestCase',
    'GiftPaymentRefundModelTestCase',
    'GiftRefundServiceTestCase',
    'GiftExpireBatchTestCase',
    'GiftSLAJobTestCase',
    'GiftNotificationSettingsAPITestCase',
    'GiftAnalyticsAPITestCase',
    'GiftMyListAPITestCase',
]

with open('tests.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []
skip_until_next_class = False

for i, line in enumerate(lines):
    # Check if this line starts a gift test class
    if line.strip().startswith('class '):
        class_name = line.strip().split('(')[0].replace('class ', '')
        if class_name in gift_classes:
            skip_until_next_class = True
            continue
    
    # Skip lines until we find the next class (not gift-related)
    if skip_until_next_class:
        if line.strip().startswith('class '):
            # Check if this is another gift class
            class_name = line.strip().split('(')[0].replace('class ', '')
            if class_name in gift_classes:
                continue
            else:
                skip_until_next_class = False
                result_lines.append(line)
        continue
    
    # If we're not in a gift test, keep the line
    if not skip_until_next_class:
        result_lines.append(line)

# Write back
with open('tests.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print(f'Removed {len(gift_classes)} gift test classes')
