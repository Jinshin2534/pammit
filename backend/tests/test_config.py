import unittest

from app.core.config import parse_openai_secret


class ParseOpenAISecretTests(unittest.TestCase):
    def test_plain_key(self) -> None:
        self.assertEqual(parse_openai_secret("sk-abc\n"), "sk-abc")

    def test_key_saved_with_quotes(self) -> None:
        self.assertEqual(parse_openai_secret('"sk-abc"'), "sk-abc")

    def test_placeholder_is_not_a_key(self) -> None:
        self.assertIsNone(parse_openai_secret("placeholder"))
        self.assertIsNone(parse_openai_secret('"placeholder"'))
        self.assertIsNone(parse_openai_secret('"broken'))


if __name__ == "__main__":
    unittest.main()
