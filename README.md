# StudyDrop

StudyDrop is a static student upload hub that runs in the browser and can be published with GitHub Pages.

## Features

- Drag-and-drop multi-file upload queue
- Student name, subject, category, due date, tags, and notes
- Search and folder filtering
- Grid and list views
- Local browser saving with `localStorage`
- JSON export of the upload list
- Responsive layout for phone, tablet, and desktop

## Run With Python

Use this version when you want uploaded files to save on your computer.

```powershell
python app.py
```

Then open:

```text
http://127.0.0.1:8000
```

Uploaded files are saved in the `uploads` folder.

## Publish On GitHub Pages

GitHub Pages can publish the website files, but it cannot run the Python upload server. Use GitHub Pages for the public front page, and run `app.py` locally when you need real file saving.

1. Create a new GitHub repository.
2. Upload these files to the repository root.
3. In GitHub, open **Settings > Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Choose the `main` branch and `/root`, then save.

GitHub will provide a public website link after the Pages build finishes.
