Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\ABC\OneDrive\Workings\MobileApp\HealthLogix\HealthLogix Logo.jpg"
$iconPath = "C:\Users\ABC\projects\NMW-Individual\PlayStore_Icon_512x512.jpg"
$featurePath = "C:\Users\ABC\projects\NMW-Individual\PlayStore_FeatureGraphic_1024x500.jpg"

if (!(Test-Path $sourcePath)) {
    Write-Host "Source image not found!"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($sourcePath)

# 1. Create 512x512 Icon
$iconBmp = New-Object System.Drawing.Bitmap(512, 512)
$gIcon = [System.Drawing.Graphics]::FromImage($iconBmp)
$gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gIcon.Clear([System.Drawing.Color]::White)
$gIcon.DrawImage($img, 0, 0, 512, 512)
$iconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$gIcon.Dispose()
$iconBmp.Dispose()

# 2. Create 1024x500 Feature Graphic
$featBmp = New-Object System.Drawing.Bitmap(1024, 500)
$gFeat = [System.Drawing.Graphics]::FromImage($featBmp)
$gFeat.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFeat.Clear([System.Drawing.Color]::White)

# Scale the logo to fit nicely in the center (e.g. 400x400)
$logoSize = 400
$posX = (1024 - $logoSize) / 2
$posY = (500 - $logoSize) / 2
$gFeat.DrawImage($img, $posX, $posY, $logoSize, $logoSize)

$featBmp.Save($featurePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$gFeat.Dispose()
$featBmp.Dispose()

$img.Dispose()

Write-Host "Images successfully generated!"
