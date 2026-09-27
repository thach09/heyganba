package com.heyganba.config;

import com.heyganba.common.exception.PayloadTooLargeException;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;

import java.io.IOException;
import java.io.InputStream;

/**
 * Input stream chỉ cho đọc tối đa `maxBytes` byte; chạm byte vượt giới hạn là ném {@link PayloadTooLargeException}.
 *
 * Dùng bởi {@link MaxPayloadSizeFilter} để chặn body khổng lồ khi client không khai báo `Content-Length`
 * (chunked transfer). Chi tiết: chỉ đọc tối đa `maxBytes + 1` byte nên body 1GB cũng chỉ tốn ~`maxBytes` bộ đệm.
 */
final class CappedServletInputStream extends ServletInputStream {

    private final InputStream delegate;
    private final long maxBytes;
    private long consumed;

    CappedServletInputStream(InputStream delegate, long maxBytes) {
        this.delegate = delegate;
        this.maxBytes = maxBytes;
    }

    @Override
    public int read() throws IOException {
        int value = delegate.read();
        if (value != -1) {
            registerConsumed(1);
        }
        return value;
    }

    @Override
    public int read(byte[] buffer, int offset, int length) throws IOException {
        int cappedLength = (int) Math.min(length, maxBytes - consumed + 1);
        if (cappedLength <= 0) {
            throw tooLarge();
        }

        int readBytes = delegate.read(buffer, offset, cappedLength);
        if (readBytes > 0) {
            registerConsumed(readBytes);
        }
        return readBytes;
    }

    @Override
    public int available() throws IOException {
        return delegate.available();
    }

    @Override
    public void close() throws IOException {
        delegate.close();
    }

    @Override
    public boolean isFinished() {
        return true;
    }

    @Override
    public boolean isReady() {
        return true;
    }

    @Override
    public void setReadListener(ReadListener readListener) {
        // App chỉ dùng request/response đồng bộ, không cần đọc bất đồng bộ cho luồng đã bị giới hạn.
        throw new UnsupportedOperationException("Async read is not supported for size-limited request body");
    }

    private void registerConsumed(long bytes) {
        consumed += bytes;
        if (consumed > maxBytes) {
            throw tooLarge();
        }
    }

    private PayloadTooLargeException tooLarge() {
        return new PayloadTooLargeException("Request body exceeds the limit of " + maxBytes + " bytes");
    }
}
