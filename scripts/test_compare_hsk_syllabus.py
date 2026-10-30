import importlib.util
import pathlib
import unittest
import sys
sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location("comparison", pathlib.Path(__file__).with_name("compare-hsk-syllabus.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SyllabusParserTest(unittest.TestCase):
    def test_multiple_level_annotations_and_homonyms_are_preserved(self):
        row = module.parse_row("71     1（2）（4）     甲1       jiǎ        名、（副）、（动）", 81)
        self.assertEqual(row["additionalLevels"], ["2", "4"])
        self.assertEqual(row["word"], "甲")
        self.assertEqual(row["homonymMarker"], "1")
        self.assertEqual(row["partOfSpeechNotation"], "名、（副）、（动）")

    def test_advanced_annotation_does_not_change_primary_level(self):
        row = module.parse_row("323   2（7-9）     甲       jiǎ       名", 88)
        self.assertEqual(row["primaryLevel"], "2")
        self.assertEqual(row["additionalLevels"], ["7-9"])

    def test_missing_pos_and_variant_notation_are_not_invented(self):
        row = module.parse_row("14    1      甲（乙）       jiǎ yǐ", 80)
        self.assertIsNone(row["partOfSpeechNotation"])
        self.assertEqual(row["word"], "甲（乙）")

    def test_different_tones_are_not_collapsed(self):
        self.assertNotEqual(module.normalized_reading("jiǎ"), module.normalized_reading("jià"))
        self.assertEqual(module.normalized_reading("JIǍ yǐ"), module.normalized_reading("jiǎyǐ"))

if __name__ == "__main__":
    unittest.main()
