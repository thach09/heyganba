"""Build reviewable SQL/reading artifacts. Authoring only: pypinyin 0.55.0, OpenCC 0.1.7.
Reference snapshots live in ignored backups/m6-source (download with m6-fetch.py).
Run from repo root. Never modifies V1-V8 or accesses a database.
"""
from pathlib import Path
import json, runpy, re, unicodedata
from pypinyin import lazy_pinyin, Style
from opencc import OpenCC

content=runpy.run_path('scripts/m6-curriculum-content.py')
cc=OpenCC('s2t')
hv=dict(line.split('=',1) for line in Path('scripts/m6-hanviet.txt').read_text(encoding='utf-8').splitlines() if line)
hv['安慰']='an úy'
reference={}
for n in range(1,7):
    for w in json.loads(Path(f'backups/m6-source/hsk{n}.json').read_text(encoding='utf-8')):
        reference.setdefault(w['simplified'],w)
def pin(text):
    return ' '.join(lazy_pinyin(text,style=Style.TONE,neutral_tone_with_five=False,errors=lambda chars:list(chars)))
def norm(p):
    # ü stays searchable as both u and v. Numbered tones are syllable-aware.
    import pypinyin.contrib.tone_convert as tone
    syllables=p.split()
    plain=' '.join(tone.to_normal(x).replace('ü','v') for x in syllables)
    numbered=' '.join(tone.to_tone3(x,neutral_tone_with_five=True).replace('ü','v') for x in syllables)
    return plain+' '+plain.replace(' ','')+' '+numbered+' '+numbered.replace(' ','')
def q(v):
    if v is None:return 'NULL'
    if isinstance(v,bool):return 'true' if v else 'false'
    if isinstance(v,int):return str(v)
    if not isinstance(v,str):v=json.dumps(v,ensure_ascii=False,separators=(',',':'))
    return "'"+v.replace("'","''")+"'"
def values(rows):return ',\n'.join('    ('+', '.join(q(v) for v in row)+')' for row in rows)
sql=['''-- M6: Approved by the explicit milestone request, not independent academic certification.
-- Original examples and Vietnamese explanations. References: docs/m6-curriculum-sources.md.
-- Existing V1-V8 content is preserved. No users or completed exam attempts are fabricated.
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS hsk_level INTEGER CHECK (hsk_level BETWEEN 1 AND 6);
ALTER TABLE reading_passages ADD COLUMN IF NOT EXISTS hsk_level INTEGER DEFAULT 1 CHECK (hsk_level BETWEEN 1 AND 6);
-- Existing V8 readings have no lesson association: classify these two known titles only.
UPDATE reading_passages SET hsk_level = 2 WHERE title IN ('Du lịch đến Bắc Kinh (去北京旅游)', 'Một ngày sinh nhật ý nghĩa (过生日)');

-- Reusable exam presets live separately from user-owned mock_exams attempts.
CREATE TABLE IF NOT EXISTS mock_exam_presets (
    id BIGSERIAL PRIMARY KEY,
    hsk_level INTEGER NOT NULL UNIQUE CHECK (hsk_level BETWEEN 1 AND 6),
    maximum_score INTEGER NOT NULL,
    passing_score INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    sections_json TEXT NOT NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    needs_human_check BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO mock_exam_presets (hsk_level, maximum_score, passing_score, duration_minutes, sections_json, review_status, needs_human_check)
VALUES
'''+values([(n,200 if n<=2 else 300,120 if n<=2 else 180,20,{'LISTENING':100,'READING':100} if n<=2 else {'LISTENING':100,'READING':100,'GRAMMAR':100},'APPROVED',False) for n in range(1,7)])+'''
ON CONFLICT (hsk_level) DO NOTHING;
''']
lessons={
1:[('hsk1-foundation-completion','HSK 1 · Từ cơ bản còn thiếu')],
2:[('hsk2-daily-communication','HSK 2 · Giao tiếp hằng ngày'),('hsk2-actions-directions','HSK 2 · Hành động và phương hướng'),('hsk2-time-shopping','HSK 2 · Thời gian và mua sắm')],
3:[('hsk3-life-environment','HSK 3 · Đời sống và môi trường'),('hsk3-work-culture','HSK 3 · Công việc và văn hóa'),('hsk3-travel-problem-solving','HSK 3 · Du lịch và xử lý tình huống')],
4:[('hsk4-career-society','HSK 4 · Nghề nghiệp và xã hội'),('hsk4-science-psychology','HSK 4 · Khoa học và tâm lý'),('hsk4-culture-communication','HSK 4 · Văn hóa và giao tiếp')],
5:[('hsk5-economy-media','HSK 5 · Kinh tế và truyền thông'),('hsk5-literature-idioms','HSK 5 · Văn học và thành ngữ'),('hsk5-debate-philosophy','HSK 5 · Lập luận và tư duy')],
6:[('hsk6-academic-governance','HSK 6 · Học thuật và quản trị'),('hsk6-classical-idioms-rhetoric','HSK 6 · Thành ngữ và tu từ')]}
lesson_rows=[];orders={}
for level,items in lessons.items():
    for slug,title in items:
        order=15+len(lesson_rows);orders[slug]=order
        lesson_rows.append((slug,title,'Từ vựng theo chủ đề, ví dụ song ngữ và bài luyện. Cấp độ là phạm vi học của bài.',f'HSK {level}',order))
sql+=['INSERT INTO lessons (slug,title,description,curriculum_level,order_index) VALUES\n'+values(lesson_rows)+'\nON CONFLICT (slug) DO NOTHING;\n']

rows=[line.split('|') for line in Path('scripts/m6-curriculum-vocabulary.tsv').read_text(encoding='utf-8').splitlines() if line and not line.startswith('#')]
vocab=[];counts={};per_level={}
for r in rows:per_level.setdefault(int(r[0]),[]).append(r)
# Group by meaning rather than random distribution, preserving stable lesson assignments.
travel=set('出 穿 船 从 到 进 离 路 旅游 旁边 起床 去年 上班 外 晚上 小时 右边 早上 长 自行车 走 左边 护照 行李 行李箱 空调 地铁 搬 换 检查 发烧 感冒 地图 方便 照顾'.split())
work=set('影响 环境 解决 决定 成绩 电子邮件 参加 重要 努力 认真 聪明 热情 礼貌 办法 办公室 城市 根据 兴趣 责任 经验 压力 态度 坚持 总结 计划 收入 质量 安全 法律 规定 保护 节约 安排 竞争 趋势 效率 危机 现象 媒体 分析 观点 合作'.split())
literature=set('传统 讲究 体会 安慰 犹豫 佩服 惭愧 忽略 彻底 明显 偶然 必然 客观 主观 盲目 谦虚 谨慎 乐观 悲观 文学 成语'.split())
for level,items in per_level.items():
    for i,(_,word,meaning,pos,example,translation) in enumerate(items):
        assert word in hv,word
        if level==1:group=0
        elif level==2:group=1 if word in travel else 2 if pos in ['Danh từ thời gian','Lượng từ','Số từ'] else 0
        elif level==3:group=2 if word in travel else 1 if word in work else 0
        elif level==4:group=0 if word in work else 1 if pos in ['Tính từ','Danh từ'] else 2
        elif level==5:group=0 if word in work else 1 if word in literature else 2
        else:group=1 if pos=='Thành ngữ' or word in ['岂不','未尝','诠释','造诣','瞻仰'] else 0
        slug=lessons[level][group][0]
        p=pin(word)
        overrides={(2,'吧'):'ba',(2,'还'):'hái',(2,'为'):'wèi',(2,'长'):'cháng',(3,'还'):'huán',(3,'行李'):'xíng li',(3,'着急'):'zháo jí',(6,'一旦'):'yī dàn',(6,'相辅相成'):'xiāng fǔ xiāng chéng'}
        p=overrides.get((level,word),p)
        # Use the dictionary form with the matching reading, not a surname/rare polyphone.
        forms=reference.get(word,{}).get('forms',[])
        match=next((f for f in forms if unicodedata.normalize('NFC',f['transcriptions']['pinyin'].lower())==p),None)
        trad=match['traditional'] if match else cc.convert(word)
        vocab.append((word,trad,p,norm(p),hv[word],pos,meaning,level,orders[slug],example,pin(example),translation,slug,'APPROVED',False,'M6:thematic;HSK2.0-ref;docs/m6-curriculum-sources.md'))
        counts[level]=counts.get(level,0)+1
sql+=['''INSERT INTO vocabulary (word,traditional,pinyin,pinyin_normalized,han_viet,part_of_speech,meaning_vi,hsk_level,lesson_number,example_zh,example_pinyin,example_vi,lesson_id,review_status,needs_human_check,source_ref)
SELECT v.word,v.traditional,v.pinyin,v.pinyin_normalized,v.han_viet,v.part_of_speech,v.meaning_vi,v.hsk_level,v.lesson_number,v.example_zh,v.example_pinyin,v.example_vi,l.id,v.review_status,v.needs_human_check,v.source_ref
FROM (VALUES
'''+values(vocab)+'''
) AS v(word,traditional,pinyin,pinyin_normalized,han_viet,part_of_speech,meaning_vi,hsk_level,lesson_number,example_zh,example_pinyin,example_vi,lesson_slug,review_status,needs_human_check,source_ref)
JOIN lessons l ON l.slug=v.lesson_slug
WHERE NOT EXISTS (SELECT 1 FROM vocabulary old WHERE old.word=v.word AND old.hsk_level=v.hsk_level AND old.lesson_id IS NOT NULL);
''']
gr=[];ex=[]
for i,(level,title,structure,explanation,notes,examples,exercises) in enumerate(content['GRAMMAR']):
    example_json=[dict(zh=zh,pinyin=pin(zh),vi=vi) for zh,vi in examples]
    exercise_json=[]
    for j,(question,answer,others) in enumerate(exercises):
        reason=explanation+' Lưu ý: '+notes
        opts=[answer]+others
        # Rotate answers, so correct answers are not always option 1.
        shift=(i+j)%4;opts=opts[shift:]+opts[:shift]
        exercise_json.append(dict(question=question,options=opts,answer=answer,explanation=reason))
        ex.append((title,question,opts,answer,reason,j==1,'M6:HSK'+str(level),'APPROVED',False,'M6:original-practice'))
    gr.append((title,structure,level,explanation,explanation,example_json,exercise_json,'Lỗi thường gặp của người Việt: '+notes,19+i,lessons[level][0][0],'APPROVED','M6:original;see docs/m6-curriculum-sources.md'))
sql+=['''INSERT INTO grammar_rules (title,structure,hsk_level,explanation_vi,explanation,examples_json,exercises_json,notes,order_index,lesson_id,review_status,source_ref)
SELECT r.title,r.structure,r.hsk_level,r.explanation_vi,r.explanation,r.examples_json,r.exercises_json,r.notes,r.order_index,l.id,r.review_status,r.source_ref
FROM (VALUES
'''+values(gr)+'''
) AS r(title,structure,hsk_level,explanation_vi,explanation,examples_json,exercises_json,notes,order_index,lesson_slug,review_status,source_ref)
JOIN lessons l ON l.slug=r.lesson_slug
WHERE NOT EXISTS (SELECT 1 FROM grammar_rules old WHERE old.title=r.title);
''']
sql+=['''INSERT INTO grammar_exercises (grammar_rule_id,question_text,options_json,correct_answer,explanation,is_common_mistake,mistake_category,review_status,needs_human_check,source_ref)
SELECT gr.id,e.question_text,e.options_json,e.correct_answer,e.explanation,e.is_common_mistake,e.mistake_category,e.review_status,e.needs_human_check,e.source_ref
FROM (VALUES
'''+values(ex)+'''
) AS e(title,question_text,options_json,correct_answer,explanation,is_common_mistake,mistake_category,review_status,needs_human_check,source_ref)
JOIN grammar_rules gr ON gr.title=e.title
WHERE NOT EXISTS (SELECT 1 FROM grammar_exercises old WHERE old.grammar_rule_id=gr.id AND old.question_text=e.question_text);
''']
hanzi=[]
for level,char,trad,p,hanviet,rad,strokes,meaning,decomp,word,wp,wv in content['HANZI']:
    hanzi.append((char,trad,p,hanviet,rad,strokes,level,meaning,'Cấu tạo hình thể: '+decomp,[dict(word=word,pinyin=wp,vi=wv)],'APPROVED',False,'M6:Unihan17;visual-components'))
sql+=['''INSERT INTO hanzi (character,traditional,pinyin,han_viet,radical,stroke_count,hsk_level,meaning_vi,decomposition,example_words_json,review_status,needs_human_check,source_ref)
VALUES
'''+values(hanzi)+'\nON CONFLICT (character) DO NOTHING;\n']
radicals=[('王',4,'Ngọc (biến thể)','ngọc'),('竹',6,'Trúc','tre'),('厂',2,'Hán','vách đá'),('彳',3,'Xích','bước chân'),('釆',7,'Biện','phân biệt'),('走',7,'Tẩu','đi, chạy'),('金',8,'Kim','kim loại'),('酉',7,'Dậu','rượu'),('尸',3,'Thi','thân người')]
sql+=['''INSERT INTO radicals (radical,stroke_count,name,meaning,review_status)
SELECT r.radical,r.stroke_count,r.name,r.meaning,'APPROVED' FROM (VALUES
'''+values(radicals)+'''
) AS r(radical,stroke_count,name,meaning)
WHERE NOT EXISTS (SELECT 1 FROM radicals old WHERE old.radical=r.radical);
''']
sql += ["INSERT INTO kanji_radicals (kanji_id,radical_id) SELECT h.id,r.id FROM hanzi h JOIN radicals r ON r.radical=h.radical WHERE h.source_ref='M6:Unihan17;visual-components' ON CONFLICT (kanji_id,radical_id) DO NOTHING;\n"]
reading=[]
for item in content['READING']:
    item['passagePinyin']=pin(item['passageText'])
    reading.append((item['title'],item['passageText'],item['translationText'],item['vocabularyNotes'],item['questions'],item['hskLevel'],lessons[item['hskLevel']][0][0]))
sql+=['''INSERT INTO reading_passages (title,passage_text,translation_text,vocabulary_notes,questions_json,hsk_level,lesson_id,review_status)
SELECT r.title,r.passage_text,r.translation_text,r.vocabulary_notes,r.questions_json,r.hsk_level,l.id,'APPROVED'
FROM (VALUES
'''+values(reading)+'''
) AS r(title,passage_text,translation_text,vocabulary_notes,questions_json,hsk_level,lesson_slug)
JOIN lessons l ON l.slug=r.lesson_slug
WHERE NOT EXISTS (SELECT 1 FROM reading_passages old WHERE old.title=r.title);
''']
for table in ['lessons','vocabulary','hanzi','radicals','grammar_rules','grammar_exercises','reading_passages','mock_exams','mock_exam_presets']:
    sql.append(f"SELECT setval(pg_get_serial_sequence('{table}','id'), COALESCE((SELECT MAX(id) FROM {table}),1), EXISTS(SELECT 1 FROM {table}));\n")
Path('backend/src/main/resources/db/migration-staging/V9__hsk1_to_hsk6_complete_curriculum_and_grammar.sql').write_text('\n'.join(sql),encoding='utf-8')
Path('frontend/src/features/dictionary/m6ReadingData.json').write_text(json.dumps(content['READING'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Vocabulary:',counts,'Grammar:',len(gr),'Exercises:',len(ex),'Hanzi:',len(hanzi),'Readings:',len(reading))
