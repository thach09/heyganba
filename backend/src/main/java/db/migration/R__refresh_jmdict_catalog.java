package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.util.zip.GZIPInputStream;

/** Checksum-driven, reproducible bulk refresh. No admin requests or runtime external API. */
public class R__refresh_jmdict_catalog extends BaseJavaMigration {
    @Override
    public Integer getChecksum() {
        try (InputStream data = getClass().getResourceAsStream("/dictionary/jmdict.tsv.gz")) {
            if (data == null) throw new IllegalStateException("Missing dictionary snapshot");
            java.util.zip.CRC32 crc = new java.util.zip.CRC32();
            // Include transformer revision: alias indexing changes must refresh even with identical data.
            crc.update("curation-format-2".getBytes(StandardCharsets.UTF_8));
            byte[] buffer = new byte[8192];
            for (int n; (n = data.read(buffer)) != -1;) crc.update(buffer, 0, n);
            crc.update(0);
            try (InputStream curated = getClass().getResourceAsStream("/dictionary/curated-ja-vi.tsv")) {
                if (curated == null) throw new IllegalStateException("Missing reviewed translation data");
                for (int n; (n = curated.read(buffer)) != -1;) crc.update(buffer, 0, n);
            }
            return (int) crc.getValue();
        } catch (IOException e) { throw new IllegalStateException("Cannot read dictionary snapshot", e); }
    }

    @Override
    public void migrate(Context context) throws Exception {
        InputStream data = getClass().getResourceAsStream("/dictionary/jmdict.tsv.gz");
        if (data == null) throw new IOException("Missing versioned JMdict snapshot");
        try (var update = context.getConnection().createStatement()) {
            update.executeUpdate("UPDATE dictionary_entries SET active = false, vietnamese_meaning = NULL, vietnamese_search_text = NULL, common_rank = 1000");
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new GZIPInputStream(data), StandardCharsets.UTF_8));
             PreparedStatement insert = context.getConnection().prepareStatement(
                     "INSERT INTO dictionary_entries(id,word,reading,meaning,search_text,active) VALUES (?,?,?,?,?,true) ON CONFLICT (id) DO UPDATE SET word=EXCLUDED.word, reading=EXCLUDED.reading, meaning=EXCLUDED.meaning, search_text=EXCLUDED.search_text, active=true")) {
            int count = 0;
            for (String line; (line = reader.readLine()) != null;) {
                String[] fields = line.split("\t", -1);
                if (fields.length != 5) throw new IOException("Invalid dictionary row " + count);
                insert.setLong(1, Long.parseLong(fields[0]));
                for (int i = 1; i < 5; i++) insert.setString(i + 1, fields[i]);
                insert.addBatch();
                if (++count % 1000 == 0) insert.executeBatch();
            }
            insert.executeBatch();
            if (count < 200000) throw new IOException("Incomplete dictionary snapshot: " + count);
        }
        applyVietnameseCuration(context);
    }

    private void applyVietnameseCuration(Context context) throws Exception {
        var rows = com.heyganba.service.DictionaryCuration.read(getClass().getResourceAsStream("/dictionary/curated-ja-vi.tsv"));
        try (PreparedStatement update = context.getConnection().prepareStatement("""
                     UPDATE dictionary_entries SET word=?, reading=?, vietnamese_meaning=?, vietnamese_search_text=?,
                         common_rank=?, search_text=search_text || ' ' || ?
                     WHERE id=? AND word=? AND reading=? AND active=true
                     """)) {
            int count = 0;
            for (var row : rows) {
                update.setString(1, row.word());
                update.setString(2, row.reading());
                update.setString(3, row.vietnamese());
                update.setString(4, row.vietnameseSearchText());
                update.setInt(5, row.commonRank());
                update.setString(6, row.additionalSearchText());
                update.setLong(7, row.id());
                update.setString(8, row.sourceWord());
                update.setString(9, row.sourceReading());
                if (update.executeUpdate() != 1) throw new IOException("Reviewed word is missing or ambiguous in JMdict: " + row.sourceWord() + " [" + row.sourceReading() + "]");
                count++;
            }
            if (count < 100) throw new IOException("Incomplete reviewed vocabulary set: " + count);
        }
    }
}
