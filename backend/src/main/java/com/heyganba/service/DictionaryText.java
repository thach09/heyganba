package com.heyganba.service;

import java.text.Normalizer;
import java.util.Locale;

public final class DictionaryText {
    private DictionaryText() {}
    public static String normalize(String text) {
        if (text == null) return "";
        String value = Normalizer.normalize(text, Normalizer.Form.NFKC);
        StringBuilder kana = new StringBuilder();
        value.codePoints().forEach(c -> kana.appendCodePoint(c >= 0x30a1 && c <= 0x30f6 ? c - 0x60 : c));
        return Normalizer.normalize(Normalizer.normalize(kana, Normalizer.Form.NFD)
                .replaceAll("([A-Za-z])\\p{M}+", "$1"), Normalizer.Form.NFC)
                .toLowerCase(Locale.ROOT).replace('đ', 'd').trim();
    }
    public static String pattern(String text) {
        return "%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
