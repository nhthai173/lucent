# Windows: Zalo gọi setAppUserModelId("com.vng.zalo") nhưng shortcut Start Menu không mang AUMID đó → Windows không đăng ký app với thông báo toast, tin tới im lặng.
# Gắn AUMID vào Zalo.lnk (tạo nếu chưa có, trỏ launcher Zalo.exe ở thư mục gốc nên không đổi theo phiên bản). Tham số: thư mục cài Zalo.
param([string]$Root)
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class Lnk {
  [ComImport, Guid("00021401-0000-0000-C000-000000000046")] class CShellLink {}
  [ComImport, Guid("0000010b-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IPersistFile { void GetClassID(out Guid g); [PreserveSig] int IsDirty(); void Load([MarshalAs(UnmanagedType.LPWStr)] string f, uint m); void Save([MarshalAs(UnmanagedType.LPWStr)] string f, bool r); void SaveCompleted(string f); void GetCurFile(out string f); }
  [StructLayout(LayoutKind.Sequential, Pack=4)] struct PK { public Guid fmt; public uint pid; }
  [StructLayout(LayoutKind.Explicit)] struct PV { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr p; }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IPropertyStore { int GetCount(out uint c); int GetAt(uint i, out PK k); int GetValue(ref PK k, out PV v); int SetValue(ref PK k, ref PV v); int Commit(); }
  public static void Set(string path, string id) {
    var l = new CShellLink(); ((IPersistFile)l).Load(path, 2);
    var k = new PK { fmt = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = 5 };
    var v = new PV { vt = 31, p = Marshal.StringToCoTaskMemUni(id) };
    var ps = (IPropertyStore)l; ps.SetValue(ref k, ref v); ps.Commit(); ((IPersistFile)l).Save(path, true);
  }
}
"@
$id = "com.vng.zalo"
$lnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Zalo.lnk"
if (-not (Test-Path $lnk)) {
  $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk); $s.TargetPath = Join-Path $Root "Zalo.exe"; $s.WorkingDirectory = $Root; $s.Save()
}
# đọc lại bằng Shell (đọc property store bằng COM thô ở đây trả rỗng dù đã ghi)
$cur = (New-Object -ComObject Shell.Application).NameSpace((Split-Path $lnk)).ParseName("Zalo.lnk").ExtendedProperty("System.AppUserModel.ID")
if ($cur -ne $id) { [Lnk]::Set($lnk, $id); "set" }
