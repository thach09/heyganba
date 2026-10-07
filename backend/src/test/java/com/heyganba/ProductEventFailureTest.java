package com.heyganba;

import com.heyganba.service.ProductEventService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProductEventFailureTest {
    @Test void unavailableStorageRollsBackOnlyTheTelemetryTransaction() {
        var jdbc = mock(JdbcTemplate.class);
        var manager = mock(PlatformTransactionManager.class);
        var status = mock(TransactionStatus.class);
        when(manager.getTransaction(any())).thenReturn(status);
        when(jdbc.update(anyString(), any(Object[].class))).thenThrow(new IllegalStateException("private connection details"));
        assertDoesNotThrow(() -> new ProductEventService(jdbc, manager).login(1L));
        verify(manager).rollback(status);
        verify(manager, never()).commit(any());
    }
}
