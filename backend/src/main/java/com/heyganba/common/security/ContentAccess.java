package com.heyganba.common.security;

import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.model.enums.ReviewStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collection;
import java.util.List;
import java.util.function.Function;

/**
 * Quy tắc hiển thị nội dung CHỜ DUYỆT (`reviewStatus != APPROVED`).
 *
 * <b>Quy tắc bắt buộc:</b> chỉ tài khoản ADMIN được thấy nội dung chưa APPROVED. Mọi tài khoản khác
 * (kể cả người chưa xác thực) chỉ được nhận nội dung đã duyệt — tuyệt đối không được render nội dung nháp ra
 * ngoài, kể cả kèm banner cảnh báo.
 *
 * Vì sao chặn ở tầng service chứ không chỉ ẩn ở UI: nội dung chờ duyệt là bản nháp CHƯA được giáo viên tiếng Nhật
 * duyệt, nên không được rời khỏi hệ thống tới bất kỳ client nào. Ẩn ở UI vẫn bị đọc trực tiếp qua API.
 *
 * Cách dùng trong service:
 * <pre>
 *   List&lt;Kana&gt; visible = ContentAccess.visibleOnly(kana, Kana::getReviewStatus);
 *   ContentAccess.requireVisible(kana.getReviewStatus(), "Kana", id);
 * </pre>
 */
public final class ContentAccess {

    /** Authority của admin — khớp với `SecurityConfig` và seed V2. */
    public static final String ADMIN_AUTHORITY = "ROLE_ADMIN";

    private ContentAccess() {
    }

    /** true nếu request hiện tại là ADMIN (đọc từ {@link SecurityContextHolder}). */
    public static boolean canSeePendingReview() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && isAdmin(authentication.getAuthorities());
    }

    public static boolean isAdmin(Collection<? extends GrantedAuthority> authorities) {
        return authorities != null && authorities.stream()
                .anyMatch(authority -> ADMIN_AUTHORITY.equals(authority.getAuthority()));
    }

    /** Một bản ghi có được phép trả ra cho request hiện tại không. */
    public static boolean isVisible(ReviewStatus status) {
        return status == ReviewStatus.APPROVED || canSeePendingReview();
    }

    /** Lọc danh sách theo trạng thái duyệt; ADMIN giữ nguyên danh sách (thấy cả bản nháp). */
    public static <T> List<T> visibleOnly(List<T> items, Function<T, ReviewStatus> statusOf) {
        if (items == null || canSeePendingReview()) {
            return items;
        }
        return items.stream()
                .filter(item -> statusOf.apply(item) == ReviewStatus.APPROVED)
                .toList();
    }

    /**
     * Chặn truy cập 1 bản ghi theo id: nếu là nội dung chờ duyệt và request không phải ADMIN thì coi như
     * KHÔNG tồn tại (404) — trả 403 sẽ vô tình xác nhận là có bản ghi đó trong hệ thống.
     */
    public static void requireVisible(ReviewStatus status, String entityName, Object id) {
        if (!isVisible(status)) {
            throw new ResourceNotFoundException(entityName, "id", id);
        }
    }
}
