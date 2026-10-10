package com.heyganba.service;

import java.util.LinkedHashSet;
import java.util.Set;

/** Derived search metadata only: displayed JMdict glosses and source identities remain intact. */
public final class DictionarySearchText {
    private DictionarySearchText() {}

    public static String catalog(String original, String meaning) {
        Set<String> terms = new LinkedHashSet<>();
        terms.add(original);
        StringBuilder gloss = new StringBuilder();
        int parentheses = 0;
        int sense = 0, synonym = 0;
        for (char character : meaning.toCharArray()) {
            if (character == '(') { parentheses++; continue; }
            if (character == ')' && parentheses > 0) { parentheses--; continue; }
            if (parentheses > 0) continue;
            if (character == ',' || character == '/' || character == ';') {
                addGloss(terms, gloss.toString(), sense, synonym++); gloss.setLength(0);
                if (character == '/') { sense++; synonym = 0; }
            } else gloss.append(character);
        }
        addGloss(terms, gloss.toString(), sense, synonym);
        terms.remove("");
        return String.join(" | ", terms);
    }

    private static void addGloss(Set<String> terms, String gloss, int sense, int synonym) {
        String normalized = DictionaryText.normalize(gloss).replaceAll("\\s+", " ").strip();
        if (normalized.isEmpty()) return;
        // Reserved markers avoid introducing artificial English search hits such as "gloss".
        String scope = sense > 0 ? "~ " : synonym > 0 ? "= " : "^ ";
        terms.add(scope + normalized);
        // Learners may omit the infinitive marker; this rule applies to every English verb gloss.
        if (normalized.startsWith("to ")) terms.add(scope + normalized.substring(3));
    }
}
