// Helper dịch bằng Translation framework của Apple (on-device, macOS 26+), chạy nền lâu dài để chỉ nạp model một lần (translate-main.js quản lý vòng đời).
// Giao thức: mỗi dòng stdin là JSON {"id":n,"to":"vi|en","t":"văn bản"}; mỗi dòng stdout là {"id":n,"t":"bản dịch"} hoặc {"id":n,"error":"..."}. Hết stdin thì thoát.
// Nguồn tự nhận bằng NLLanguageRecognizer; gói ngôn ngữ phải được cài sẵn (Cài đặt hệ thống > Ngôn ngữ & vùng > Ngôn ngữ dịch).
import Foundation
import NaturalLanguage
import Translation

func emit(_ d: [String: Any]) {
    print(String(data: try! JSONSerialization.data(withJSONObject: d), encoding: .utf8)!)
    fflush(stdout)
}

@available(macOS 26.0, *)
var sessions: [String: TranslationSession] = [:] // theo cặp nguồn>đích, tái dùng để khỏi nạp lại model

@available(macOS 26.0, *)
func translate(_ text: String, to: String) async -> [String: Any] {
    let target = Locale.Language(identifier: to)
    let rec = NLLanguageRecognizer()
    rec.processString(text)
    guard let code = rec.dominantLanguage?.rawValue else { return ["error": "không nhận ra ngôn ngữ"] }
    let source = Locale.Language(identifier: code)
    if source.languageCode == target.languageCode { return ["t": text] }
    do {
        let key = "\(code)>\(to)"
        let session = sessions[key] ?? TranslationSession(installedSource: source, target: target)
        sessions[key] = session
        // dịch từng dòng (một lô) rồi ghép lại bằng "\n": dịch cả khối thì model hay gộp đoạn, mất xuống dòng / danh sách của bản gốc
        // (đã đo: song song nhiều session/luồng không nhanh hơn, engine xử lý lần lượt)
        let lines = text.components(separatedBy: "\n")
        let reqs = lines.enumerated().filter { !$0.element.trimmingCharacters(in: .whitespaces).isEmpty }
            .map { TranslationSession.Request(sourceText: $0.element, clientIdentifier: String($0.offset)) }
        var res = lines
        for r in try await session.translations(from: reqs) {
            if let i = r.clientIdentifier.flatMap({ Int($0) }) { res[i] = r.targetText }
        }
        return ["t": res.joined(separator: "\n")]
    } catch {
        sessions[ "\(code)>\(to)" ] = nil // session hỏng thì lần sau tạo lại
        return ["error": "chưa cài gói dịch \(code)→\(to) hoặc lỗi: \(error.localizedDescription)"]
    }
}

Task {
    do {
        for try await line in FileHandle.standardInput.bytes.lines {
            guard let d = line.data(using: .utf8), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
                  let id = o["id"], let to = o["to"] as? String, let t = o["t"] as? String else { continue }
            var r: [String: Any]
            if #available(macOS 26.0, *) { r = await translate(t, to: to) } else { r = ["error": "cần macOS 26 trở lên"] }
            r["id"] = id
            emit(r)
        }
    } catch {}
    exit(0)
}
RunLoop.main.run()
