"""Execute this project's standard-library notebook cells and save real outputs.
This is a sequential Python runner, not a Jupyter kernel or a general notebook engine.
"""
import argparse
import contextlib
import io
import json
from pathlib import Path
import traceback


def execute(path):
    notebook = json.loads(path.read_text(encoding="utf-8-sig"))
    assert notebook["nbformat"] == 4
    namespace = {"__name__": "__main__", "NOTEBOOK_DIR": path.parent.resolve()}
    count = 0
    for cell in notebook["cells"]:
        if cell["cell_type"] != "code":
            continue
        count += 1
        output = io.StringIO()
        cell["execution_count"] = count
        cell["outputs"] = []
        try:
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                exec(compile("".join(cell["source"]), f"{path.name}:cell{count}", "exec"), namespace)
        except Exception as error:
            cell["outputs"].append({"output_type": "error", "ename": type(error).__name__, "evalue": str(error), "traceback": traceback.format_exc().splitlines()})
            path.write_text(json.dumps(notebook, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
            raise
        if output.getvalue():
            cell["outputs"].append({"output_type": "stream", "name": "stdout", "text": output.getvalue().splitlines(keepends=True)})
            print(output.getvalue(), end="")
    path.write_text(json.dumps(notebook, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Executed {count} code cells successfully; saved outputs to {path}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("notebook", nargs="?", default=str(Path(__file__).resolve().parents[1] / "notebooks" / "SmartSort_AI_Algorithms.ipynb"))
    execute(Path(parser.parse_args().notebook).resolve())
