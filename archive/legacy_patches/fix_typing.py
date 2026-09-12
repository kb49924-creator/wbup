import os

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if '| None' in content or 'list[' in content or 'dict[' in content or 'tuple[' in content or 'type |' in content:
                if 'from __future__ import annotations' not in content:
                    lines = content.split('\n')
                    # Find first line that is not empty and not a comment or docstring
                    insert_idx = 0
                    in_docstring = False
                    for i, line in enumerate(lines):
                        stripped = line.strip()
                        if not in_docstring and (stripped.startswith('"""') or stripped.startswith("'''")):
                            if stripped.count('"""') == 1 or stripped.count("'''") == 1:
                                in_docstring = True
                            continue
                        if in_docstring and (stripped.endswith('"""') or stripped.endswith("'''")):
                            in_docstring = False
                            insert_idx = i + 1
                            continue
                        if in_docstring:
                            continue
                        if stripped.startswith('#') or not stripped:
                            continue
                        # Got first actual code line
                        insert_idx = max(insert_idx, i)
                        break
                    
                    lines.insert(insert_idx, 'from __future__ import annotations')
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write('\n'.join(lines))
                    print(f"Fixed {path}")
