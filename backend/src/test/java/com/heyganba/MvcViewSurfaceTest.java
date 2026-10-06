package com.heyganba;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.web.servlet.view.xslt.XsltView;
import org.springframework.web.servlet.view.xslt.XsltViewResolver;
import com.heyganba.support.ContentApiTestBase;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Do not enable the XSLT rendering surface while CVE-2026-47884 is excepted in the dependency audit. */
class MvcViewSurfaceTest extends ContentApiTestBase {
    @Autowired ApplicationContext context;
    @Test void applicationDoesNotEnableXsltViews() {
        assertTrue(context.getBeansOfType(XsltView.class).isEmpty());
        assertTrue(context.getBeansOfType(XsltViewResolver.class).isEmpty());
    }
}
