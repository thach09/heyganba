package com.heyganba.service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Reviewed enrichment format shared by Flyway and offline pilot rehearsal. No new storage. */
public final class DictionaryCuration {
    private DictionaryCuration() {}

    public record Row(long id, String sourceWord, String sourceReading, String word, String reading,
                      String vietnamese, int commonRank, List<String> vietnameseAliases, List<String> englishAliases) {
        public String vietnameseSearchText() {
            Set<String> terms = new LinkedHashSet<>();
            for (String term : concat(List.of(vietnamese), vietnameseAliases)) {
                terms.add(DictionaryText.normalize(term));
                terms.add(DictionaryText.normalizePreservingDiacritics(term));
                for (String gloss : term.split(";")) {
                    terms.add(DictionaryText.normalize(gloss));
                    terms.add(DictionaryText.normalizePreservingDiacritics(gloss));
                }
            }
            return String.join(" | ", terms);
        }
        public String additionalSearchText() {
            String japanese = DictionaryText.normalize(word + " " + reading);
            return englishAliases.isEmpty() ? japanese : japanese + " | " + String.join(" | ",
                    englishAliases.stream().map(DictionaryText::normalize).toList());
        }
    }

    public static List<Row> read(InputStream input) throws IOException {
        if (input == null) throw new IOException("Missing reviewed Vietnamese enrichment");
        List<Row> rows = new ArrayList<>();
        Set<Long> ids = new HashSet<>();
        try (var reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            int number = 0;
            for (String line; (line = reader.readLine()) != null;) {
                number++;
                if (line.isBlank() || line.startsWith("#")) continue;
                String[] fields = line.split("\\t", -1);
                if (fields.length != 7 && fields.length != 9) throw new IOException("Invalid enrichment columns at row " + number);
                for (String field : fields) {
                    if (!field.equals(field.strip()) || field.codePoints().anyMatch(Character::isISOControl) || field.contains("|"))
                        throw new IOException("Malformed enrichment field at row " + number);
                }
                try {
                    long id = Long.parseLong(fields[0]);
                    int rank = Integer.parseInt(fields[6]);
                    if (id <= 0 || rank < 0 || !ids.add(id)) throw new IllegalArgumentException("Invalid or duplicate identity");
                    for (int i = 1; i <= 5; i++) if (fields[i].isBlank()) throw new IllegalArgumentException("Empty meaning/identity");
                    if (fields[3].length() > 100 || fields[4].length() > 100) throw new IllegalArgumentException("Oversized identity");
                    rows.add(new Row(id, fields[1], fields[2], fields[3], fields[4], fields[5], rank,
                            fields.length == 9 ? aliases(fields[7]) : List.of(), fields.length == 9 ? aliases(fields[8]) : List.of()));
                } catch (IllegalArgumentException e) { throw new IOException("Invalid enrichment row " + number, e); }
            }
        }
        return List.copyOf(rows);
    }

    private static List<String> aliases(String value) {
        if (value.isEmpty()) return List.of();
        List<String> aliases = Arrays.stream(value.split(";", -1)).map(String::strip).toList();
        Set<String> normalized = new HashSet<>();
        for (String alias : aliases) {
            if (alias.isBlank() || alias.length() > 100 || !normalized.add(DictionaryText.normalizePreservingDiacritics(alias)))
                throw new IllegalArgumentException("Invalid or duplicate alias");
        }
        return aliases;
    }

    private static List<String> concat(List<String> first, List<String> second) {
        List<String> result = new ArrayList<>(first); result.addAll(second); return result;
    }
}
