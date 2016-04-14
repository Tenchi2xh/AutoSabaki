var process = require('process')
var app = require('electron').app
var ipcMain = require('electron').ipcMain
var setting = require('./modules/setting')

var BrowserWindow = require('electron').BrowserWindow
var Menu = require('electron').Menu

var windows = []
var openfile = null
var isReady = false

function newWindow(path) {
    var window = new BrowserWindow({
        icon: process.platform == 'linux' ? __dirname + '/logo.png' : null,
        title: 'Sabaki',
        useContentSize: true,
        width: setting.get('window.width'),
        height: setting.get('window.height'),
        minWidth: setting.get('window.minwidth'),
        minHeight: setting.get('window.minheight'),
        backgroundColor: '#EAB45E',
        webPreferences: {
            textAreasAreResizable: false
        }
    })

    windows.push(window)
    buildMenu()

    window.webContents.setAudioMuted(!setting.get('sound.enable'))
    window.webContents
        .on('did-finish-load', function() {
            window.setBackgroundColor('#111')
            if (path) window.webContents.send('load-game', path)
        })
        .on('new-window', function(e) { e.preventDefault() })

    window.on('closed', function() {
        window = null
    })

    window.loadURL('file://' + __dirname + '/view/index.html')
    // window.toggleDevTools()

    return window
}

function buildMenu(noWindows) {
    var template = JSON.parse(JSON.stringify(require('./menu.json')))

    // Create app menu for OS X

    if (process.platform == 'darwin') {
        var appMenu = [{
            label: 'About {name}',
            role: 'about'
        }]

        // Remove original 'Check for Updates' menu item

        var helpMenu = template.filter(function(x) { return x.label.replace('&', '') == 'Help' })[0]
        var items = helpMenu.submenu.splice(0, 3)

        appMenu.push.apply(appMenu, items.slice(0, noWindows ? 1 : 2))

        // Remove original 'Preferences' menu item

        var fileMenu = template.filter(function(x) { return x.label.replace('&', '') == 'File' })[0]
        var preferenceItem = fileMenu.submenu.splice(fileMenu.submenu.length - 2, 2)[1]

        if (noWindows) preferenceItem.enabled = false

        appMenu.push.apply(appMenu, [
            { type: 'separator' },
            preferenceItem,
            { type: 'separator' },
            {
                label: 'Services',
                submenu: [],
                role: 'services'
            },
            { type: 'separator' },
            {
                label: 'Hide {name}',
                accelerator: 'CmdOrCtrl+H',
                role: 'hide'
            },
            {
                label: 'Hide Others',
                accelerator: 'CmdOrCtrl+Alt+H',
                role: 'hideothers'
            },
            { type: 'separator' },
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click: function() { app.quit() }
            }
        ])

        template.unshift({
            label: '{name}',
            submenu: appMenu
        })

        if (noWindows) template = [template[0]]

        // Add 'Window' menu

        template.splice(noWindows ? template.length : template.length - 1, 0, {
            label: 'Window',
            submenu: [
                {
                    label: 'New Window',
                    click: newWindow.bind(null, null)
                },
                {
                    label: 'Minimize',
                    role: 'minimize',
                    accelerator: 'CmdOrCtrl+M'
                },
                { type: 'separator' },
                {
                    label: 'Bring All to Front',
                    role: 'front'
                }
            ],
            role: 'window'
        })
    }

    // Load engines

    var engineMenu = template.filter(function(x) { return x.label.replace('&', '') == 'Engine' })[0]

    if (engineMenu) {
        var attachMenu = engineMenu.submenu[0].submenu

        attachMenu.length = 0

        setting.getEngines().forEach(function(engine) {
            attachMenu.push({
                label: engine.name,
                click: function() {
                    var window = BrowserWindow.getFocusedWindow()
                    if (!window) return

                    window.webContents.send('attach-engine', engine.path, engine.args)
                }
            })
        })

        if (setting.getEngines().length != 0) {
            attachMenu.push({ type: 'separator' })
        }

        attachMenu.push({
            label: '&Manage Engines…',
            action: 'manageengines'
        })
    }

    // Handle clicks

    var handleClicks = function(items) {
        items.forEach(function(item) {
            if ('label' in item) {
                item.label = item.label
                .replace('{name}', app.getName())
                .replace('{version}', app.getVersion())
            }

            if ('action' in item) {
                var action = item.action

                item.click = function() {
                    var window = BrowserWindow.getFocusedWindow()
                    if (!window) return

                    window.webContents.send('menu-click', action)
                }

                delete item.action
            }

            if ('submenu' in item) {
                handleClicks(item.submenu)
            }
        })
    }

    handleClicks(template)

    // Build

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))

    // Create dock menu

    if (process.platform == 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([{
            label: 'New Window',
            click: newWindow.bind(null, null)
        }]))
    }
}

ipcMain.on('new-window', function(e, path) { newWindow(path) })

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit()
    } else {
        buildMenu(true)
    }
})

app.on('ready', function() {
    isReady = true

    if (!openfile && process.argv.length >= 2)
        openfile = process.argv[1]

    newWindow(openfile)
})

app.on('activate', function(e, hasVisibleWindows) {
    if (!hasVisibleWindows) newWindow()
})

app.on('open-file', function(e, path) {
    e.preventDefault()

    if (!isReady) {
        openfile = path
    } else {
        newWindow(path)
    }
})
