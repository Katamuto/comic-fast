; Icono propio para los archivos .cfast en el Explorador de Windows.
; El instalador de Tauri ya asocia la extensión con la app; aquí solo se fija el icono.
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\.cfast\DefaultIcon" "" "$INSTDIR\cfast.ico,0"
  WriteRegStr SHCTX "Software\Classes\ComicFast.Project\DefaultIcon" "" "$INSTDIR\cfast.ico,0"
  WriteRegStr SHCTX "Software\Classes\Proyecto de Comic Fast\DefaultIcon" "" "$INSTDIR\cfast.ico,0"
  ; avisa al Explorador para que refresque los iconos
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey SHCTX "Software\Classes\.cfast\DefaultIcon"
  DeleteRegKey SHCTX "Software\Classes\ComicFast.Project\DefaultIcon"
  DeleteRegKey SHCTX "Software\Classes\Proyecto de Comic Fast\DefaultIcon"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
