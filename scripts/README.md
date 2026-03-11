
# MLLM Multi-Agent Judge

This project implements a **multi-agent evaluation system for Multi-Modal Large Language Models (MLLMs)**. It uses **Microsoft AutoGen** to orchestrate a team of **Judge Agents** that evaluate image descriptions and answers using:

- **Psychophysical / CV metrics** (e.g., sharpness, noise, contrast, composition proxies, style adherence)
- **Semantic consistency** between the vision context and model answers
- **Multi-agent agreement / disagreement** to flag uncertain cases for human handoff

The output is a structured JSON report with per-dimension scores, disagreement estimates, and optional handoff flags.

---

## 📂 File Structure

- **`autogen_multiagents.py`**  
  Main entry point. Orchestrates AutoGen judge agents, runs evaluation, aggregates scores, and emits JSON output.

- **`metrics_psycho.py`**  
  Utility library with computer vision + perceptual scoring components (OpenCV / CLIP / LPIPS when available) that computes objective metrics such as sharpness, contrast, and style adherence.

- **`mllm-judge.yml`**  
  Conda environment configuration (reproducible dependencies).

- **`plot_metrics.py`**  
  Visualization helper: generates a chart/report from the JSON output.

---

## 🛠️ Installation

### 1) Prerequisites
Install **Anaconda** or **Miniconda**.

### 2) Create the environment
Use the provided `mllm-judge.yml`:

```bash
# Create the environment
conda env create -f mllm-judge.yml

# Activate the environment
conda activate mllm-judge
````

**Note:** This environment is expected to include PyTorch, OpenCV, AutoGen, and CLIP support.

---

## 🚀 How to Run

### 1) Prepare input files

You need:

* **An image**: the frame you want to evaluate (e.g., `frame.jpg`)
* **Answers JSON**: model outputs you want to judge

Example `answers.json`:

```json
{
  "GPT-4V": "The image features a cinematic lighting setup with strong rim light...",
  "Gemini": "A dramatic shot with high contrast and blue hues..."
}
```

### 2) Run the Judge (CLI)

Run `autogen_multiagents.py` and provide: image, question, vision context, answers, and output path.

```bash
python autogen_multiagents.py \
  --image "path/to/frame.jpg" \
  --question "Describe the lighting and composition." \
  --vision-context "A high-contrast movie scene with blue backlighting." \
  --answers-json "answers.json" \
  --out "result.json"
```

#### Arguments

* `--image`
  Path to the image file (**recommended**; required if you want objective metrics like sharpness/noise).

* `--question`
  The prompt given to the models.

* `--vision-context`
  Ground-truth / metadata / reference context. Can be **a raw string** or **a file path** to a text file.

* `--answers-json`
  Path to the JSON file containing `{model_name: answer_text}`.

* `--out`
  Output file path for saving the detailed evaluation JSON.

* `--time-budget` *(optional)*
  Max time (seconds) for agents to deliberate (default: `8.0`).

### 3) Review results

The script prints JSON to console and writes it to `--out` if provided.

Example output:

```json
{
  "final_score": 7.5,
  "by_group": {
    "light": { "score": 0.8, "disagreement": 0.1 },
    "composition": { "score": 0.65, "disagreement": 0.05 }
  },
  "flags": []
}
```

* `final_score`: final aggregated score (typically scaled to 0–10)
* `by_group`: per-dimension scores + disagreement signals
* `flags`: empty if stable; may include handoff triggers when disagreement is high or mean score is low

---

## 📊 Visualization

`plot_metrics.py` generates a visual report (bar charts for scores and disagreement).

**Note:** If `plot_metrics.py` currently contains hardcoded sample data, you can plot your real result like this:

1. Open `plot_metrics.py`
2. Replace the `data_str` (or similar variable) with the JSON output from `autogen_multiagents.py`
3. Run:

```bash
python plot_metrics.py
```

This generates an image file (e.g., `visualization_5.png`) summarizing scores and agent agreement/disagreement.



