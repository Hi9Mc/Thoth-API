"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortDirection = exports.SearchLogicalOperator = exports.SearchConditionOperator = void 0;
var SearchConditionOperator;
(function (SearchConditionOperator) {
    SearchConditionOperator["EQUALS"] = "=";
    SearchConditionOperator["NOT_EQUALS"] = "!=";
    SearchConditionOperator["GREATER_THAN"] = ">";
    SearchConditionOperator["GREATER_THAN_OR_EQUAL"] = ">=";
    SearchConditionOperator["LESS_THAN"] = "<";
    SearchConditionOperator["LESS_THAN_OR_EQUAL"] = "<=";
    SearchConditionOperator["LIKE"] = "LIKE";
    SearchConditionOperator["NOT_LIKE"] = "NOT LIKE";
    SearchConditionOperator["IN"] = "IN";
    SearchConditionOperator["NOT_IN"] = "NOT IN";
    SearchConditionOperator["BETWEEN"] = "BETWEEN";
})(SearchConditionOperator || (exports.SearchConditionOperator = SearchConditionOperator = {}));
var SearchLogicalOperator;
(function (SearchLogicalOperator) {
    SearchLogicalOperator["AND"] = "AND";
    SearchLogicalOperator["OR"] = "OR";
})(SearchLogicalOperator || (exports.SearchLogicalOperator = SearchLogicalOperator = {}));
var SortDirection;
(function (SortDirection) {
    SortDirection["ASC"] = "ASC";
    SortDirection["DESC"] = "DESC";
})(SortDirection || (exports.SortDirection = SortDirection = {}));
