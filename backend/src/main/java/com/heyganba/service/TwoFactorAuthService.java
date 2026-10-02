package com.heyganba.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;

/**
 * Service xác thực hai yếu tố (2FA) theo chuẩn RFC 6238 TOTP (Time-based One-Time Password)
 * tương thích với Google Authenticator, Microsoft Authenticator, 1Password...
 *
 * Thuật toán: HMAC-SHA1, chu kỳ 30 giây, mã 6 chữ số, cho phép chênh lệch thời gian ±1 bước (±30s).
 */
@Service
public class TwoFactorAuthService {

    private static final String HMAC_ALGO = "HmacSHA1";
    private static final int TIME_STEP_SECONDS = 30;
    private static final int CODE_DIGITS = 6;
    private static final int MODULUS = 1_000_000;
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Tạo Secret key ngẫu nhiên gồm 20 byte (160-bit), mã hoá Base32 thành chuỗi 32 ký tự.
     */
    public String generateSecret() {
        byte[] buffer = new byte[20];
        secureRandom.nextBytes(buffer);
        return encodeBase32(buffer);
    }

    /**
     * Tạo đường dẫn URI chuẩn otpauth để các ứng dụng Authenticator quét mã QR hoặc nhập thủ công.
     */
    public String getOtpAuthUrl(String email, String secret) {
        String issuer = "HeyGanba";
        String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8);
        String encodedEmail = URLEncoder.encode(email, StandardCharsets.UTF_8);
        return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s", encodedIssuer, encodedEmail, secret, encodedIssuer);
    }

    /**
     * Xác thực mã TOTP 6 số mà người dùng nhập vào.
     * Cho phép lệch ±1 bước thời gian (hiện tại, -30s, +30s) để xử lý lệch đồng hồ nhẹ.
     */
    public boolean verifyCode(String secret, String code) {
        if (secret == null || code == null || !code.matches("^\\d{6}$")) {
            return false;
        }

        long currentStep = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;
        byte[] keyBytes = decodeBase32(secret);

        for (long step = currentStep - 1; step <= currentStep + 1; step++) {
            if (generateCodeForStep(keyBytes, step).equals(code)) {
                return true;
            }
        }
        return false;
    }

    private String generateCodeForStep(byte[] keyBytes, long step) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(step).array();
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGO));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int otp = binary % MODULUS;
            return String.format("%0" + CODE_DIGITS + "d", otp);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Lỗi tính toán mã TOTP", e);
        }
    }

    private static String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                result.append(BASE32_CHARS.charAt((buffer >> bitsLeft) & 0x1F));
            }
        }

        if (bitsLeft > 0) {
            result.append(BASE32_CHARS.charAt((buffer << (5 - bitsLeft)) & 0x1F));
        }

        return result.toString();
    }

    private static byte[] decodeBase32(String base32) {
        String clean = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        ByteBuffer bytes = ByteBuffer.allocate((clean.length() * 5) / 8);

        int buffer = 0;
        int bitsLeft = 0;

        for (int i = 0; i < clean.length(); i++) {
            int val = BASE32_CHARS.indexOf(clean.charAt(i));
            if (val < 0) continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;

            if (bitsLeft >= 8) {
                bitsLeft -= 8;
                bytes.put((byte) ((buffer >> bitsLeft) & 0xFF));
            }
        }

        return Arrays.copyOf(bytes.array(), bytes.position());
    }
}
