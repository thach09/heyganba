package com.heyganba.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Request body vượt giới hạn cho phép (413 Payload Too Large) — chống DoS bằng payload nặng.
 * Giới hạn cấu hình ở `app.security.max-request-bytes` (xem {@code MaxPayloadSizeFilter}).
 */
@ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
public class PayloadTooLargeException extends RuntimeException {

    public PayloadTooLargeException(String message) {
        super(message);
    }
}
