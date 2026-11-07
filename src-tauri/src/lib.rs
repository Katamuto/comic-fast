// Comic Fast: el backend es intencionalmente mínimo.
// Abrir/guardar archivos y diálogos se hacen desde TypeScript con los plugins
// oficiales. Aquí iría solo lo que de verdad necesite Rust (filtros de imagen
// pesados, por ejemplo) como comandos `#[tauri::command]`.

/// Lee un archivo soltado sobre la ventana (arrastrar desde el explorador). Solo imágenes y proyectos.
/// En Linux y macOS la ventana recibe los archivos como rutas (ver `tauri.linux.conf.json`) y el
/// frontend los pide con esta orden; limitar las extensiones evita que sirva para leer otros archivos.
#[tauri::command]
fn read_dropped_file(path: String) -> Result<tauri::ipc::Response, String> {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    const OK: [&str; 10] = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "avif", "tif", "cfast"];
    if !OK.contains(&ext.as_str()) {
        return Err("tipo de archivo no permitido".into());
    }
    std::fs::read(&path)
        .map(tauri::ipc::Response::new)
        .map_err(|e| e.to_string())
}

use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Proyectos (.cfast) con los que se abrió la app (doble clic, «Abrir con…») y que el frontend aún no ha recogido.
#[derive(Default)]
struct OpenedFiles(Mutex<Vec<String>>);

/// Rutas .cfast de una lista de argumentos (la primera es el ejecutable: se salta).
fn cfast_args<I: IntoIterator<Item = String>>(args: I) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|a| a.to_ascii_lowercase().ends_with(".cfast"))
        .collect()
}

fn push_opened(app: &tauri::AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    if let Some(state) = app.try_state::<OpenedFiles>() {
        state.0.lock().unwrap().extend(paths);
    }
    // Si la ventana ya está lista, se le avisa; si no, los recogerá al arrancar con `take_opened_files`.
    let _ = app.emit("open-files", ());
}

/// Devuelve (y olvida) los proyectos pendientes de abrir.
#[tauri::command]
fn take_opened_files(state: tauri::State<OpenedFiles>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Una sola ventana: si se abre otro .cfast con la app ya en marcha, el archivo llega a esa ventana.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            push_opened(app, cfast_args(argv));
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .manage(OpenedFiles(Mutex::new(cfast_args(std::env::args()))))
        .invoke_handler(tauri::generate_handler![read_dropped_file, take_opened_files])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .build(tauri::generate_context!())
        .expect("error al iniciar Comic Fast")
        .run(|_app, _event| {
            // macOS entrega los archivos abiertos con un evento, no como argumentos.
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let tauri::RunEvent::Opened { urls } = _event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().into_owned())
                    .filter(|p| p.to_ascii_lowercase().ends_with(".cfast"))
                    .collect();
                push_opened(_app, paths);
            }
        });
}
