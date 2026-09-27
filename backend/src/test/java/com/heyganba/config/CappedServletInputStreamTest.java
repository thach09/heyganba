package com.heyganba.config;

import com.heyganba.common.exception.PayloadTooLargeException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Unit test cho lớp chặn body vượt kích thước khi client KHÔNG khai báo `Content-Length`
 * (chunked transfer) — trường hợp không thể kiểm chứng qua MockMvc vì MockMvc luôn set Content-Length.
 */
class CappedServletInputStreamTest {

    private static final int LIMIT = 8;

    private InputStream streamWithBytes(int totalBytes) {
        return new CappedServletInputStream(new ByteArrayInputStream(new byte[totalBytes]), LIMIT);
    }

    @Test
    @DisplayName("Đọc từng byte: đủ giới hạn còn nguyên, byte vượt giới hạn ném PayloadTooLargeException")
    void readSingleByte_ThrowsRightAfterLimit() throws IOException {
        InputStream stream = streamWithBytes(64);

        for (int i = 0; i < LIMIT; i++) {
            assertEquals(0, stream.read());
        }

        assertThrows(PayloadTooLargeException.class, stream::read);
    }

    @Test
    @DisplayName("Đọc theo buffer: body vượt giới hạn bị chặn ngay ở lần đọc đầu")
    void readBuffer_ThrowsWhenBodyExceedsLimit() {
        InputStream stream = streamWithBytes(1024);
        byte[] buffer = new byte[32];

        assertThrows(PayloadTooLargeException.class, () -> stream.read(buffer, 0, buffer.length));
    }

    @Test
    @DisplayName("Body nằm trong giới hạn: đọc đủ byte rồi trả -1, không ném lỗi")
    void readBuffer_BodyWithinLimit_ReadsUntilEnd() throws IOException {
        InputStream exactLimitStream = streamWithBytes(LIMIT);
        byte[] buffer = new byte[32];

        assertEquals(LIMIT, exactLimitStream.read(buffer, 0, buffer.length));
        assertEquals(-1, exactLimitStream.read(buffer, 0, buffer.length));

        InputStream smallStream = streamWithBytes(3);
        assertEquals(3, smallStream.read(buffer, 0, buffer.length));
        assertEquals(-1, smallStream.read(buffer, 0, buffer.length));
    }
}
