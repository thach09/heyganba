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
    public static String normalizePreservingDiacritics(String text) {
        if (text == null) return "";
        String value = Normalizer.normalize(text, Normalizer.Form.NFKC);
        StringBuilder kana = new StringBuilder();
        value.codePoints().forEach(c -> kana.appendCodePoint(c >= 0x30a1 && c <= 0x30f6 ? c - 0x60 : c));
        return Normalizer.normalize(kana, Normalizer.Form.NFC).toLowerCase(Locale.ROOT).trim();
    }

    public static boolean hasLatinDiacritics(String text) {
        boolean previousWasLatin = false;
        for (int codePoint : Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD).codePoints().toArray()) {
            int type = Character.getType(codePoint);
            if (type == Character.NON_SPACING_MARK || type == Character.COMBINING_SPACING_MARK) {
                if (previousWasLatin) return true;
                continue;
            }
            previousWasLatin = Character.UnicodeScript.of(codePoint) == Character.UnicodeScript.LATIN;
        }
        return false;
    }

    public static String pattern(String text) {
        return "%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
    public static String prefix(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
