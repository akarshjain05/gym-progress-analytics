import ast
import os

def test_no_duplicate_keys_in_exercise_to_standard():
    file_path = os.path.join(os.path.dirname(__file__), "../app/calculations.py")
    with open(file_path, "r") as f:
        tree = ast.parse(f.read())
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "EXERCISE_TO_STANDARD":
                    # node.value is a Dict
                    if isinstance(node.value, ast.Dict):
                        keys = [k.value for k in node.value.keys if isinstance(k, ast.Constant)]
                        assert len(keys) == len(set(keys)), "Duplicate keys found in EXERCISE_TO_STANDARD"
