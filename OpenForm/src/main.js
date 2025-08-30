const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your app icon
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('generate-scad', async (event, description) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // TODO: Move this to environment variables in production
    const API_KEY = 'AIzaSyAtSsiOGD-swYtxrgxjSlMbvYikUwF915Y';
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Generate OpenSCAD code for the following 3D model description. 
    Only return valid OpenSCAD code without any markdown formatting or explanation.
    Make sure the code is complete and can be directly executed in OpenSCAD.
    Add appropriate comments for clarity. Ensure that the model is cleanly designed, elements are centered when appropriate, and parts that should sit flush sit flush. 
    Add fillets when appropriate. 
    
    Description: ${description}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let scadCode = response.text();
    
    // Remove Markdown code fences if present
    scadCode = scadCode.replace(/^\s*```[a-zA-Z]*\s*([\s\S]*?)\s*```/gm, '$1').trim();
    
    return { success: true, code: scadCode };
  } catch (error) {
    console.error('Error generating SCAD:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-scad-file', async (event, code, filename) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename || 'model.scad',
      filters: [
        { name: 'OpenSCAD Files', extensions: ['scad'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (filePath) {
      await fs.writeFile(filePath, code, 'utf8');
      return { success: true, path: filePath };
    }
    
    return { success: false, error: 'No file selected' };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('render-model', async (event, scadCode) => {
  try {
    // Ask user for STL save location
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'model.stl',
      filters: [
        { name: 'STL Files', extensions: ['stl'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!filePath) {
      return { success: false, error: 'No file selected' };
    }

    // Create temporary SCAD file
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const scadFile = path.join(tempDir, 'temp_model.scad');

    // Write SCAD code to file
    await fs.writeFile(scadFile, scadCode, 'utf8');

    // Execute OpenSCAD command to generate STL at user location
    const command = `openscad -o "${filePath}" "${scadFile}"`;
    await execAsync(command);

    // Generate PNG preview using OpenSCAD
    const pngPath = path.join(tempDir, 'temp_model.png');
    const pngCommand = `openscad -o "${pngPath}" --imgsize=800,600 "${scadFile}"`;
    await execAsync(pngCommand);

    // Check if STL file was created
    try {
      await fs.access(filePath);
      // Check if PNG was created
      let pngExists = false;
      try {
        await fs.access(pngPath);
        pngExists = true;
      } catch {}
      return { success: true, stlPath: filePath, pngPath: pngExists ? pngPath : null };
    } catch {
      return { success: false, error: 'STL file was not generated' };
    }
  } catch (error) {
    console.error('Error rendering model:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-openscad', async () => {
  try {
    await execAsync('openscad --version');
    return { installed: true };
  } catch (error) {
    return { installed: false };
  }
});