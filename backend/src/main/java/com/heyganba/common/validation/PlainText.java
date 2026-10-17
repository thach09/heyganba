package com.heyganba.common.validation;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.FIELD,ElementType.PARAMETER,ElementType.RECORD_COMPONENT,ElementType.TYPE_USE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy=PlainTextValidator.class)
public @interface PlainText {
    String message() default "Chỉ chấp nhận văn bản thuần, không chứa thẻ HTML hoặc ký tự điều khiển.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
