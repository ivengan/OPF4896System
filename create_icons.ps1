Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$size,
        [string]$text,
        [string]$outputPath
    )
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(12, 74, 110)) # #0c4a6e
    $graphics.FillRectangle($brush, $rect)

    $fontFamily = New-Object System.Drawing.FontFamily("Arial")
    $fontSize = $size / 3.5
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $graphics.DrawString($text, $font, $textBrush, $rect, $format)

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

$dir = "d:\OPF4896System\icons"
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir
}

Create-Icon -size 512 -text "OPF" -outputPath "$dir\icon-512.png"
Create-Icon -size 192 -text "OPF" -outputPath "$dir\icon-192.png"
