"""测试工具通用函数。"""

import pytest

from openclaw_py.agents.tools.common import (
    error_result,
    json_result,
    read_bool_param,
    read_int_param,
    read_number_param,
    read_string_param,
    success_result,
    text_result,
)


class TestReadStringParam:
    """测试 read_string_param"""

    def test_read_string_required(self):
        params = {"name": "John"}
        result = read_string_param(params, "name", required=True)
        assert result == "John"

    def test_read_string_optional(self):
        params = {}
        result = read_string_param(params, "name", required=False)
        assert result is None

    def test_read_string_required_missing(self):
        params = {}
        with pytest.raises(ValueError, match="name required"):
            read_string_param(params, "name", required=True)

    def test_read_string_trim(self):
        params = {"name": "  John  "}
        result = read_string_param(params, "name", trim=True)
        assert result == "John"

    def test_read_string_no_trim(self):
        params = {"name": "  John  "}
        result = read_string_param(params, "name", trim=False)
        assert result == "  John  "


class TestReadNumberParam:
    """测试 read_number_param"""

    def test_read_number(self):
        params = {"age": 25}
        result = read_number_param(params, "age")
        assert result == 25.0

    def test_read_number_float(self):
        params = {"price": 19.99}
        result = read_number_param(params, "price")
        assert result == 19.99

    def test_read_number_missing(self):
        params = {}
        result = read_number_param(params, "age", required=False)
        assert result is None

    def test_read_number_min_max(self):
        params = {"age": 25}
        result = read_number_param(params, "age", min_value=0, max_value=100)
        assert result == 25.0

    def test_read_number_below_min(self):
        params = {"age": -5}
        with pytest.raises(ValueError, match="must be >= 0"):
            read_number_param(params, "age", min_value=0)


class TestReadIntParam:
    """测试 read_int_param"""

    def test_read_int(self):
        params = {"count": 42}
        result = read_int_param(params, "count")
        assert result == 42
        assert isinstance(result, int)

    def test_read_int_from_float(self):
        params = {"count": 42.7}
        result = read_int_param(params, "count")
        assert result == 42


class TestReadBoolParam:
    """测试 read_bool_param"""

    def test_read_bool_true(self):
        params = {"enabled": True}
        result = read_bool_param(params, "enabled")
        assert result is True

    def test_read_bool_false(self):
        params = {"enabled": False}
        result = read_bool_param(params, "enabled")
        assert result is False

    def test_read_bool_string_true(self):
        params = {"enabled": "true"}
        result = read_bool_param(params, "enabled")
        assert result is True

    def test_read_bool_default(self):
        params = {}
        result = read_bool_param(params, "enabled", default=False)
        assert result is False


class TestResultFunctions:
    """测试结果格式化函数"""

    def test_text_result(self):
        result = text_result("Hello, world!")
        assert result.content == "Hello, world!"
        assert result.is_error is False

    def test_error_result(self):
        result = error_result("Something went wrong")
        assert result.content == "Something went wrong"
        assert result.is_error is True

    def test_json_result(self):
        data = {"key": "value", "count": 42}
        result = json_result(data)
        assert "key" in result.content
        assert "value" in result.content
        assert result.is_error is False

    def test_success_result(self):
        result = success_result("Operation completed")
        assert result.content == "Operation completed"
        assert result.is_error is False
