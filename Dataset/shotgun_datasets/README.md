# ShotGrid Latest Final Asset Exporter (MoonShine)

This repository exports **one “final” asset per Project** from ShotGrid using the **official ShotGrid (Shotgun) Python API**.

For each Project, it will:

- Create folders by **Type → Project Name**
- Save `meta.json` including Project fields you requested
- Find the **latest updated Version that has an asset**
  - **Image (thumbnail) preferred**
  - If no image, download **uploaded movie** (Attachment)
- Save:
  - `final.jpg` (or `final.<ext>` for movie)
  - `final_version.json` with **Artist / Status / Task** and version link
- Write a root `_index.json` with all exported metadata

---

## Output Structure

```

shotgrid_export_api/ <Type>/
<Project_Name>/
meta.json
final_version.json
final.jpg               # preferred
final.mov or .mp4   # fallback if no image
_index.json

````

---

## Requirements

- macOS / Linux / Windows
- Python **3.9+** recommended
- A ShotGrid **Script API user**:
  - `script_name`
  - `api_key`
- Access to the site (e.g. `https://moonshine.shotgunstudio.com`)

---

## Installation

### 1) Create and activate a virtual environment (recommended)

```bash
python -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows PowerShell
````

### 2) Install dependencies

```bash
pip install --upgrade pip
pip install shotgun_api3 python-dateutil python-slugify
brew install ffmpeg
# check
ffmpeg -version
ffprobe -version

```

> If you also want optional dataframes/CSV later, you can install pandas:
>
> ```bash
> pip install pandas
> ```

---

## Configure Credentials (IMPORTANT)

You must pass your API key; do **not** leave it empty.

### Option A — Pass in CLI flags (quick)

You will run:

* `--script-name`
* `--api-key`

### Option B — Use environment variables (recommended)

```bash
export SHOTGRID_SCRIPT_NAME="your_script_name"
export SHOTGRID_API_KEY="your_api_key"
```

Then reference them when running:

```bash
--script-name "$SHOTGRID_SCRIPT_NAME" --api-key "$SHOTGRID_API_KEY"
```

---

## Run

From the folder containing `export_latest_assets.py`:

```bash
python export_latest_assets.py \
  --site "https://moonshine.shotgunstudio.com" \
  --script-name "YOUR_SCRIPT_NAME" \
  --api-key "YOUR_API_KEY" \
  --out "shotgrid_export_api" \
  --project-regex ".*" \
  --version-limit 500 \
  --artist-fields "sg_artist,user,created_by"
```

Get Keyframes jpg from mov/mp4 files of shot by running `extract_keyframes_recursive.py`:

```bash
python extract_keyframes_recursive.py --root "shotgrid_export_api"
```

### Arguments

* `--site`
  ShotGrid site URL (default: `https://moonshine.shotgunstudio.com`)

* `--script-name`, `--api-key`
  Script credentials

* `--out`
  Output directory

* `--project-regex`
  Regex filter for Project name (e.g. `"^MS_"`)

* `--version-limit`
  How many Versions to scan per Project (sorted by `updated_at` desc)

* `--artist-fields`
  Comma-separated list of candidate Version fields for “Artist”.
  Different studios store “artist” in different fields, so the script tries them in order.

---

## What Project Fields Are Exported?

The script exports the following **Project fields** into `meta.json` under `project_fields`:

* Art Director
* CG Lead
* CG Sup
* Color
* Comp Sup
* Director
* Duration
* End Date
* Favorite
* FPS
* Fx Sup
* PC
* PM
* Render Engine
* Render Engine Detail
* Res Height
* Res Width
* Scale
* Start Date
* Status
* Tags
* Tank Name
* Unit
* Zulip Stream

> The script uses ShotGrid **schema lookup** to map these **display names** to internal field names automatically.

---

## How “Type” Folder Is Determined

The top-level folder name is based on the Project field whose **display name** is `"Type"`.

If your studio uses a different label (e.g. `"Project Type"`), update the script constant:

```python
TYPE_DISPLAY_NAME = "Type"
```

---

## Troubleshooting

### 1) `TypeError: unhashable type: 'dict'` during schema read

Your ShotGrid schema returns `props["name"]` as a dict (multilingual label object).
Make sure your script includes a helper like:

* `display_name_to_str(...)` to convert dict → string
* and uses it inside `schema_display_to_field(...)`

If you already applied that patch, this error should be gone.

### 2) Authentication failed / 403

* Ensure `--api-key` is **not empty**
* Ensure the Script user is enabled and has permissions to read:

  * `Project`
  * `Version`
  * `Attachment` (if you want movies)

### 3) Project Type is always `UNKNOWN`

* Your site might not label the field as `"Type"`.
* Inspect the Project schema and search for the correct display name, then update `TYPE_DISPLAY_NAME`.

### 4) Movie download missing

This script expects the Version field `sg_uploaded_movie` (common in many pipelines).
If your studio uses a different field for movie/attachment, modify:

* the fields requested for Version
* the fallback logic in `download_best_asset(...)`

---

## Security Notes

* **Do not commit** your API key to Git.
* Prefer environment variables or local config not tracked by version control.
* Treat exported assets as production data: store them securely.

---

## License

Internal use / studio tooling. Add a license if you plan to distribute outside your organization.
