package com.heyganba.service;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.dto.kana.KanaQuizCheckResponse;
import com.heyganba.dto.kana.KanaResponse;
import com.heyganba.model.entity.Kana;
import com.heyganba.model.enums.KanaGroup;
import com.heyganba.model.enums.KanaType;
import com.heyganba.repository.KanaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class KanaService {

    /** Ghi chú dạng "ji (di)": lấy phần trong ngoặc làm đáp án thay thế. */
    private static final Pattern PARENTHETICAL = Pattern.compile("\\(([^)]*)\\)");

    /**
     * Các cặp romaji Hepburn ↔ Kunrei thường gặp — học viên gõ kiểu nào cũng được tính đúng.
     */
    private static final Map<String, String> ROMAJI_ALIASES = Map.ofEntries(
            Map.entry("si", "shi"),
            Map.entry("ti", "chi"),
            Map.entry("tu", "tsu"),
            Map.entry("hu", "fu"),
            Map.entry("zi", "ji"),
            Map.entry("dji", "ji"),
            Map.entry("dzu", "zu"),
            Map.entry("sya", "sha"),
            Map.entry("syu", "shu"),
            Map.entry("syo", "sho"),
            Map.entry("cya", "cha"),
            Map.entry("cyu", "chu"),
            Map.entry("cyo", "cho"),
            Map.entry("zya", "ja"),
            Map.entry("zyu", "ju"),
            Map.entry("zyo", "jo"),
            Map.entry("jya", "ja"),
            Map.entry("jyu", "ju"),
            Map.entry("jyo", "jo")
    );

    private final KanaRepository kanaRepository;

    @Transactional(readOnly = true)
    public List<KanaResponse> getKana(KanaType type, KanaGroup group) {
        List<Kana> kana;
        if (type != null && group != null) {
            kana = kanaRepository.findByKanaTypeAndKanaGroupOrderByIdAsc(type, group);
        } else if (type != null) {
            kana = kanaRepository.findByKanaTypeOrderByIdAsc(type);
        } else if (group != null) {
            kana = kanaRepository.findByKanaGroup(group);
        } else {
            kana = kanaRepository.findAllByOrderByIdAsc();
        }

        return kana.stream().map(KanaResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public KanaResponse getKanaById(Long id) {
        Kana kana = kanaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kana", "id", id));

        return KanaResponse.from(kana);
    }

    /**
     * Chấm điểm quiz phía server: chuẩn hoá Unicode + chấp nhận biến thể romaji,
     * không dùng bất kỳ giá trị đúng/sai nào do client gửi lên.
     */
    @Transactional(readOnly = true)
    public KanaQuizCheckResponse checkQuizAnswer(Long kanaId, String userAnswer) {
        Kana kana = kanaRepository.findById(kanaId)
                .orElseThrow(() -> new ResourceNotFoundException("Kana", "id", kanaId));

        String submitted = normalize(userAnswer);
        boolean correct = acceptedAnswers(kana.getRomaji()).contains(submitted);

        return new KanaQuizCheckResponse(correct, kana.getCharacter(), kana.getRomaji(), submitted);
    }

    private static String normalize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC);
        return normalized.trim().toLowerCase(Locale.ROOT);
    }

    private static Set<String> acceptedAnswers(String romaji) {
        Set<String> accepted = new HashSet<>();
        String normalized = normalize(romaji);
        accepted.add(normalized);

        Matcher matcher = PARENTHETICAL.matcher(normalized);
        while (matcher.find()) {
            String inside = matcher.group(1).trim();
            if (!inside.isEmpty()) {
                accepted.add(inside);
            }
        }

        String withoutParentheses = PARENTHETICAL.matcher(normalized).replaceAll("").trim();
        if (!withoutParentheses.isEmpty()) {
            accepted.add(withoutParentheses);
        }

        for (String candidate : Set.copyOf(accepted)) {
            String alias = ROMAJI_ALIASES.get(candidate);
            if (alias != null) {
                accepted.add(alias);
            }
            ROMAJI_ALIASES.forEach((from, to) -> {
                if (to.equals(candidate)) {
                    accepted.add(from);
                }
            });
        }

        return accepted;
    }
}
