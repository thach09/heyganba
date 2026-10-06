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
            byte[] buffer = new byte[8192];
            for (int n; (n = data.read(buffer)) != -1;) crc.update(buffer, 0, n);
            return (int) crc.getValue();
        } catch (IOException e) { throw new IllegalStateException("Cannot read dictionary snapshot", e); }
    }

    @Override
    public void migrate(Context context) throws Exception {
        InputStream data = getClass().getResourceAsStream("/dictionary/jmdict.tsv.gz");
        if (data == null) throw new IOException("Missing versioned JMdict snapshot");
        try (var update = context.getConnection().createStatement()) {
            update.executeUpdate("UPDATE dictionary_entries SET active = false");
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
    }
}
