package com.heyganba.service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Strict offline format for high-confidence Vietnamese assisted glosses. */
public final class AssistedDictionaryCuration {
    private AssistedDictionaryCuration() {}

    public record Row(long id, String word, String reading, String englishSense, String vietnameseMeaning,
                      List<String> vietnameseAliases, List<String> englishAliases, String status,
                      String confidence, String reviewNote) {
        public DictionaryCuration.Row asSearchRow() {
            return new DictionaryCuration.Row(id, word, reading, word, reading, vietnameseMeaning, 1000,
                    vietnameseAliases, englishAliases);
        }
    }

    /** Columns: id, word, reading, English sense, VI meaning, VI aliases, EN aliases, status, confidence, note. */
    public static List<Row> read(InputStream input) throws IOException {
        if (input == null) throw new IOException("Missing assisted Vietnamese enrichment");
        List<Row> rows = new ArrayList<>();
        Set<Long> ids = new HashSet<>();
        try (var reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            int number = 0;
            for (String line; (line = reader.readLine()) != null;) {
                number++;
                if (line.isBlank() || line.startsWith("#")) continue;
                String[] fields = line.split("\t", -1);
                if (fields.length != 10) throw new IOException("Invalid assisted enrichment columns at row " + number);
                for (String field : fields) {
                    if (!field.equals(field.strip()) || field.codePoints().anyMatch(Character::isISOControl) || field.contains("|"))
                        throw new IOException("Malformed assisted enrichment field at row " + number);
                }
                try {
                    long id = Long.parseLong(fields[0]);
                    if (id <= 0 || !ids.add(id)) throw new IllegalArgumentException("Invalid or duplicate identity");
                    for (int i : new int[]{1, 2, 3, 4, 7, 8, 9}) {
                        if (fields[i].isBlank()) throw new IllegalArgumentException("Empty identity, sense, status, confidence, or note");
                    }
                    if (fields[1].length() > 100 || fields[2].length() > 100)
                        throw new IllegalArgumentException("Oversized identity");
                    if (!fields[7].equals("ASSISTED")) throw new IllegalArgumentException("Only ASSISTED rows are publishable from this source");
                    if (!fields[8].equals("A"))
                        throw new IllegalArgumentException("Only A-confidence rows are publishable");
                    rows.add(new Row(id, fields[1], fields[2], fields[3], fields[4], aliases(fields[5]),
                            aliases(fields[6]), fields[7], fields[8], fields[9]));
                } catch (IllegalArgumentException e) {
                    throw new IOException("Invalid assisted enrichment row " + number, e);
                }
            }
        }
        if (rows.isEmpty()) throw new IOException("Assisted Vietnamese enrichment is empty");
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
}
