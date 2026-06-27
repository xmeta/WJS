# AGENTS.md

このリポジトリは、Work Breakdown Structure（WBS）をJSONで表現・交換・検証・編集するための仕様 **WBS-JSON** を管理するためのものです。

AIエージェントは、このリポジトリ内の仕様、JSON Schema、サンプル、検証ルール、操作仕様を改善できます。ただし、WBS-JSONは人間とAIの両方が扱う標準仕様を目指すため、変更は慎重に行ってください。

---

## 1. このプロジェクトの目的

このプロジェクトの目的は、WBSを以下のように扱える標準仕様を作ることです。

* JSONで表現できる
* JSON Schemaで検証できる
* 人間が読んでも理解しやすい
* AIが原子的な差分操作で安全に編集できる
* BPMN、要件定義、成果物管理、Issue管理、ガントチャート等と接続できる
* 特定ベンダーや特定ツールに依存しない

WBS-JSONは、単なるタスク一覧ではありません。

WBS-JSONでは、以下を区別して扱います。

* 成果物: `deliverable`
* 作業パッケージ: `workPackage`
* 実行アクティビティ: `activity`
* マイルストーン: `milestone`
* 集約ノード: `summary`

---

## 2. 重要な設計思想

### 2.1 正本はフラット構造を優先する

WBSはツリー構造ですが、仕様上の正本データは原則として `nodes` 配列と `parentId` によるフラット構造を優先します。

理由:

* DBに保存しやすい
* AIが差分編集しやすい
* Git差分が読みやすい
* ノード移動が簡単
* 循環や重複の検証をしやすい

表示用のツリーは派生データとして扱います。

### 2.2 親子関係と依存関係を分ける

`parentId` はWBSの分解構造を表します。

`relations` は、ツリー以外の関係を表します。

例:

* `dependsOn`
* `blocks`
* `produces`
* `consumes`
* `implementsRequirement`
* `refinesBpmnTask`
* `linkedToIssue`
* `relatedTo`

重要:

* `children` や `parentId` の順序を実行順として扱ってはいけません。
* 実行順や前後関係は `relations` の `dependsOn` で表してください。

### 2.3 AI編集は意味付き操作を優先する

AIにWBS全体を再生成させるのではなく、`wbs-operations.schema.json` に従った差分操作を出させます。

悪い例:

```json
{
  "op": "replace",
  "path": "/nodes/3/name",
  "value": "API設計"
}
```

良い例:

```json
{
  "operation": "renameNode",
  "nodeId": "node-api-design",
  "name": "API設計"
}
```

WBS専用の意味付き操作を使うことで、レビューしやすく、事故が減ります。

---

## 3. ディレクトリ構成

推奨構成は以下です。

```text
wbs-json-spec/
├── AGENTS.md
├── README.md
├── specification/
│   ├── wbs-json-v0.1.md
│   ├── terminology.md
│   ├── conformance.md
│   ├── operations/
│   └── validation-rules.md
├── schema/
│   ├── wbs-json.schema.json
│   └── wbs-operations.schema.json
├── examples/
│   ├── minimal.json
│   ├── software-project.json
│   ├── business-process-improvement.json
│   └── care-workflow-system.json
├── tests/
│   ├── valid/
│   └── invalid/
└── tools/
    ├── apply.ts
    ├── validate.ts
    └── normalize.ts
```

---

## 4. AIエージェントが編集してよいもの

AIエージェントは以下を編集してよいです。

* `README.md`
* `specification/*.md`
* `specification/operations/*.md`
* `specification/operations/*/*.md`
* `schema/*.schema.json`
* `examples/*.json`
* `tests/valid/*.json`
* `tests/invalid/*.json`
* `tools/*.ts`
* `AGENTS.md`

ただし、仕様変更を行う場合は、関連ファイルも必ず同期してください。

例:

`wbs-operations.schema.json` に新しい操作を追加した場合:

* `specification/operations.md` に操作の意味を追加する
* `examples/` に使用例を追加する
* `tests/valid/` に妥当な例を追加する
* `tests/invalid/` に不正な例を追加する
* `README.md` の概要が古くなる場合は更新する

---

## 5. AIエージェントが避けるべきこと

以下は禁止または原則禁止です。

### 5.1 仕様を勝手に大きく破壊しない

既存フィールド名、operation名、enum値を変更・削除する場合は、互換性への影響を明記してください。

悪い例:

```text
workPackage を task に変更する
```

このような変更は既存データを壊します。

変更する場合は、移行方針を必ず書いてください。

### 5.2 特定ツール専用の仕様にしない

WBS-JSONは特定のプロジェクト管理ツール、チケット管理ツール、BPMNツール、ガントチャートツールに依存しない仕様です。

悪い例:

```json
{
  "jiraIssueId": "PROJ-123"
}
```

良い例:

```json
{
  "relations": [
    {
      "id": "rel-issue-001",
      "type": "linkedToIssue",
      "source": "node-api-design",
      "target": "jira:PROJ-123"
    }
  ]
}
```

### 5.3 JSON Schemaだけで全ルールを表現しようとしない

JSON Schemaで表現しにくいルールは、無理に複雑なSchemaへ押し込まないでください。

例えば以下はアプリケーションレベル検証に回してよいです。

* ノードIDの全体一意性
* `parentId` の存在チェック
* 循環参照チェック
* `dependsOn` の循環チェック
* `outputs` が存在する `artifacts` を参照しているか
* `owner` が存在する `resources` を参照しているか
* `code` が階層と一致しているか

これらは `specification/validation-rules.md` に明記してください。

---

## 6. JSON Schema作成ルール

### 6.1 Draft 2020-12を使う

JSON Schemaは原則として Draft 2020-12 を使います。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

### 6.2 `additionalProperties: false` を基本にする

仕様の中核オブジェクトでは、原則として `additionalProperties: false` を使います。

ただし、拡張用の `extensions` は許可します。

```json
{
  "extensions": {
    "type": "object",
    "additionalProperties": true
  }
}
```

### 6.3 拡張は `extensions` に閉じ込める

独自拡張をトップレベルに直接増やさないでください。

悪い例:

```json
{
  "customJiraField": "..."
}
```

良い例:

```json
{
  "extensions": {
    "jira": {
      "field": "..."
    }
  }
}
```

### 6.4 `allOf` と `additionalProperties: false` の組み合わせに注意する

JSON Schemaバリデータによっては、`allOf` と `additionalProperties: false` の組み合わせで意図しない検証結果になることがあります。

操作スキーマでは、互換性を優先して、各Operation定義に `operationId` と `comment` を直接書いてもよいです。

### 6.5 `oneOf` を使うときは曖昧さを避ける

複数のOperationが同時に一致しないように、必ず `operation` に `const` を使ってください。

例:

```json
{
  "operation": {
    "const": "addNode"
  }
}
```

---

## 7. 命名規則

### 7.1 JSONフィールド名

JSONフィールド名は `camelCase` を使います。

良い例:

```json
{
  "schemaVersion": "0.1.0",
  "targetWbsId": "wbs-example",
  "baseRevision": "rev-001"
}
```

悪い例:

```json
{
  "schema_version": "0.1.0",
  "target_wbs_id": "wbs-example"
}
```

### 7.2 ID

IDは安定した文字列にしてください。

良い例:

```text
node-api-design
artifact-openapi-yaml
resource-backend-team
rel-api-after-data-model
```

避ける例:

```text
1
2
3
```

ただし、WBSコードとしての `code` には `1.2.3` のような番号体系を使ってよいです。

### 7.3 WBSコード

`code` は人間が読む階層番号です。

例:

```text
1
1.1
1.1.1
1.2
```

`id` と `code` は分けて考えてください。

---

## 8. WBS本体仕様の原則

WBS本体は以下のトップレベル構造を基本とします。

```json
{
  "schemaVersion": "0.1.0",
  "id": "wbs-example",
  "name": "Example WBS",
  "rootId": "node-root",
  "nodes": [],
  "relations": [],
  "resources": [],
  "artifacts": [],
  "metadata": {},
  "extensions": {}
}
```

### 8.1 `nodes`

`nodes` はWBSノードの配列です。

各ノードは以下を基本とします。

```json
{
  "id": "node-api-design",
  "parentId": "node-system-design",
  "code": "1.2.1",
  "name": "API設計",
  "type": "workPackage",
  "status": "planned"
}
```

### 8.2 `relations`

`relations` はツリー以外の関係を表します。

```json
{
  "id": "rel-api-after-data-model",
  "type": "dependsOn",
  "source": "node-api-design",
  "target": "node-data-model"
}
```

### 8.3 `artifacts`

`artifacts` は成果物を表します。

```json
{
  "id": "artifact-openapi-yaml",
  "name": "OpenAPI仕様書",
  "type": "document",
  "uri": "./docs/openapi.yaml"
}
```

### 8.4 `resources`

`resources` は人、チーム、ロール、組織を表します。

```json
{
  "id": "resource-backend-team",
  "name": "バックエンドチーム",
  "type": "team"
}
```

---

## 9. WBS Operations仕様の原則

`wbs-operations.schema.json` は、WBS本体を安全に変更するための操作仕様です。

基本形:

```json
{
  "schemaVersion": "0.1.0",
  "targetWbsId": "wbs-example",
  "baseRevision": "rev-001",
  "changeSetId": "changeset-001",
  "author": "ai-agent",
  "createdAt": "2026-06-24T00:00:00+09:00",
  "reason": "API設計作業を追加するため",
  "dryRun": true,
  "operations": []
}
```

### 9.1 `dryRun`

AIが提案する変更は、原則として `dryRun: true` を推奨します。

人間または安全な自動処理が確認した後に適用してください。

### 9.2 `baseRevision`

`baseRevision` は可能な限り指定してください。

これにより、古いWBSに対する変更を誤って適用する事故を減らせます。

### 9.3 `operationId`

各操作には `operationId` を付けることを推奨します。

エラー報告、レビュー、ロールバック、ログ追跡に使えます。

---

## 10. 操作カテゴリ

WBS Operationsは以下のカテゴリに分けます。

### 10.1 Node Operations

* `addNode`
* `updateNode`
* `renameNode`
* `moveNode`
* `deleteNode`
* `changeNodeStatus`
* `reorderChildren`

### 10.2 Relation Operations

* `addRelation`
* `updateRelation`
* `deleteRelation`

### 10.3 Artifact Operations

* `addArtifact`
* `updateArtifact`
* `deleteArtifact`

### 10.4 Resource Operations

* `addResource`
* `updateResource`
* `deleteResource`

### 10.5 Convenience Operations

* `setNodeOutputs`
* `addNodeOutput`
* `deleteNodeOutput`
* `addAcceptanceCriterion`
* `deleteAcceptanceCriterion`
* `addTag`
* `deleteTag`

### 10.6 Refactoring Operations

v0.2以降で検討します。

* `splitNode`
* `mergeNodes`
* `renumberSubtree`

---

## 11. Convenience Operationsの扱い

Convenience Operationsは `updateNode` でも代替できます。

しかし、AIが配列全体を誤って上書きする事故を防ぐため、専用操作として定義します。

### 11.1 `setNodeOutputs`

対象ノードの `outputs` を全置換します。

注意:

* これは追加ではなく全置換です。
* AIが既存成果物を消す危険があるため、レビュー時に注意してください。
* 1件だけ変更する場合は `addNodeOutput` または `deleteNodeOutput` を優先してください。

### 11.2 `addNodeOutput`

対象ノードの `outputs` に成果物IDを1件追加します。

同一成果物IDが既にある場合は、冪等操作として成功扱いにしてよいです。

### 11.3 `deleteNodeOutput`

対象ノードの `outputs` から成果物IDを1件削除します。

指定成果物IDが存在しない場合も、冪等操作として成功扱いにしてよいです。ただし警告を出すことを推奨します。

### 11.4 `addAcceptanceCriterion`

対象ノードの `acceptanceCriteria` に完了条件を1件追加します。

### 11.5 `deleteAcceptanceCriterion`

対象ノードの `acceptanceCriteria` から完了条件を1件削除します。

削除指定は、原則として文字列指定を推奨します。

```json
{
  "operation": "deleteAcceptanceCriterion",
  "nodeId": "node-api-design",
  "criterion": "古いAPI設計書が作成されている"
}
```

UI操作では `index` 指定も許可してよいです。

### 11.6 `addTag`

対象ノードにタグを1件追加します。

同一タグが既にある場合は、冪等操作として成功扱いにしてよいです。

### 11.7 `deleteTag`

対象ノードからタグを1件削除します。

指定タグが存在しない場合も、冪等操作として成功扱いにしてよいです。ただし警告を出すことを推奨します。

---

## 12. 仕様変更時の必須チェック

AIエージェントは仕様を変更した場合、以下を確認してください。

### 12.1 Schemaと仕様本文の同期

以下が一致していることを確認してください。

* 操作名
* フィールド名
* required項目
* enum値
* デフォルト値
* 例
* 検証ルール

### 12.2 サンプルの妥当性

`examples/` のJSONが最新Schemaに適合するか確認してください。

### 12.3 テストケースの追加

新しいフィールドや操作を追加した場合は、以下を追加してください。

* 妥当な例: `tests/valid/`
* 不正な例: `tests/invalid/`

### 12.4 後方互換性

破壊的変更の場合は、必ず以下を記載してください。

* 何が壊れるか
* なぜ変更する必要があるか
* 旧形式から新形式への移行方法
* 互換期間を設けるか

---

## 13. 検証ルールの扱い

JSON Schemaでは表現しにくい検証は、`specification/validation-rules.md` に書いてください。

代表的な検証:

```text
- nodes[].id は文書内で一意である
- rootId は既存 nodes[].id を参照している
- parentId は null または既存 nodes[].id を参照している
- parentId に循環がない
- root は1つである
- relations[].source / target の参照先が適切である
- dependsOn に循環がない
- nodes[].outputs は artifacts[].id を参照している
- nodes[].owner は resources[].id を参照している
- code は推奨ルールに従っている
```

---

## 14. 互換性ポリシー

### 14.1 PATCHバージョン

誤字修正、説明追加、例の追加、非破壊的なSchema説明の改善。

例:

```text
0.1.0 -> 0.1.1
```

### 14.2 MINORバージョン

後方互換性のあるフィールド追加、operation追加、enum追加。

例:

```text
0.1.0 -> 0.2.0
```

### 14.3 MAJORバージョン

既存データを壊す変更。

例:

```text
0.1.0 -> 1.0.0
```

MAJOR変更を行う場合は、移行ガイドを必ず作成してください。

---

## 15. AIエージェントへの具体的な作業指示

### 15.1 仕様改善を依頼された場合

次の順序で作業してください。

1. 現在の仕様の意図を確認する
2. 既存設計と矛盾しない改善案を考える
3. 必要なら仕様本文を更新する
4. 必要ならJSON Schemaを更新する
5. 必要ならサンプルを追加する
6. 必要ならvalid/invalidテストを追加する
7. 破壊的変更がある場合は明記する

### 15.2 Schemaを書く場合

以下を守ってください。

* Draft 2020-12を使う
* `camelCase` を使う
* 中核オブジェクトは `additionalProperties: false`
* 独自拡張は `extensions`
* enum値は安易に増やさない
* `description` をできるだけ書く
* 実装しにくいSchemaにしない
* JSON Schemaで無理なものは検証ルール文書に分離する

### 15.3 Operationを追加する場合

新しいOperationには必ず以下を定義してください。

* 操作名
* 目的
* 入力JSON例
* 操作前後の意味
* JSON Schema定義
* 検証ルール
* 冪等性
* 失敗条件
* 他Operationとの関係
* AIが誤用しやすい点

---

## 16. レビュー観点

変更をレビューするときは、以下を確認してください。

### 16.1 人間に読みやすいか

* 名前が分かりやすいか
* 説明が十分か
* 例があるか
* 仕様用語が統一されているか

### 16.2 AIに扱いやすいか

* 差分操作で編集できるか
* 巨大JSONの再生成を避けられるか
* 参照IDが安定しているか
* 操作意図が明確か
* レビュー可能な粒度か

### 16.3 実装しやすいか

* JSON Schemaが複雑すぎないか
* DBに保存しやすいか
* バリデータ実装が現実的か
* TypeScript型生成しやすいか
* RustやPythonでも扱いやすいか

### 16.4 拡張しやすいか

* BPMN連携が可能か
* 要件管理と接続できるか
* Issue管理と接続できるか
* 成果物管理と接続できるか
* ガントチャート等へ変換できるか

---

## 17. よくある判断基準

### 17.1 フィールドを追加するか、`extensions` に入れるか

標準仕様として多くの利用者が使うならフィールド化します。

特定組織・特定ツールだけで使うなら `extensions` に入れます。

### 17.2 新しいoperationを追加するか、`updateNode` で済ませるか

以下に当てはまるなら専用operationを追加してよいです。

* AIが誤って配列全体を上書きしやすい
* 人間レビューで意味が分かりにくい
* 操作の副作用がある
* 専用の検証ルールが必要
* UI操作として独立している

例:

* `addTag`
* `deleteTag`
* `addAcceptanceCriterion`
* `deleteAcceptanceCriterion`

### 17.3 relation typeを増やすか

標準的に多くのWBSで使う関係だけをenumに入れます。

特定ドメイン固有の関係は `relatedTo` と `extensions` で表現してください。

---

## 18. 用語の統一

以下の用語を使ってください。

| 用語              | 意味                |
| --------------- | ----------------- |
| WBS document    | WBS全体のJSON文書      |
| WBS node        | WBSを構成するノード       |
| WBS code        | 人間向けの階層番号         |
| Node ID         | 機械向けの安定ID         |
| Artifact        | 成果物               |
| Resource        | 人、チーム、ロール、組織      |
| Relation        | 親子以外の関係           |
| Operation       | WBSを変更する意味付き操作    |
| Change set      | 複数Operationのまとまり  |
| Validation rule | JSON Schema外の意味検証 |

日本語では以下を使ってください。

| 英語              | 日本語    |
| --------------- | ------ |
| WBS document    | WBS文書  |
| WBS node        | WBSノード |
| Artifact        | 成果物    |
| Resource        | リソース   |
| Relation        | 関係     |
| Operation       | 操作     |
| Change set      | 変更セット  |
| Validation rule | 検証ルール  |

---

## 19. コード生成・型生成への配慮

この仕様は、将来的に以下へ展開される可能性があります。

* TypeScript型
* Rust構造体
* Python Pydanticモデル
* OpenAPI schema
* Mermaid / PlantUML変換
* BPMN連携ツール
* ガントチャート変換
* GitHub Issues連携
* Markdownドキュメント生成

そのため、以下を意識してください。

* enum名は安定させる
* フィールド名を短くしすぎない
* 文脈依存の曖昧な値を避ける
* `any` 的な構造を増やしすぎない
* 拡張は `extensions` に隔離する
* ID参照の方向を明確にする

---

## 20. サンプル作成ルール

サンプルは現実的にしてください。

良いサンプル:

```json
{
  "id": "node-api-design",
  "parentId": "node-system-design",
  "code": "1.2.1",
  "name": "API設計",
  "type": "workPackage",
  "status": "planned",
  "outputs": ["artifact-openapi-yaml"]
}
```

悪いサンプル:

```json
{
  "id": "a",
  "name": "test"
}
```

サンプルには、可能なら以下を含めてください。

* 複数階層のWBS
* 依存関係
* 成果物
* リソース
* 完了条件
* タグ
* BPMNや要件へのリンク例

---

## 21. invalidテストの例

不正例として、以下を用意してください。

* `schemaVersion` がない
* `rootId` が存在しないノードを参照している
* `parentId` が存在しないノードを参照している
* `parentId` が循環している
* `nodes[].id` が重複している
* `relations[].type` が不正
* `dependsOn` が循環している
* `outputs` が存在しない artifact を参照している
* `owner` が存在しない resource を参照している
* operation名が不正
* `deleteAcceptanceCriterion` で `criterion` と `index` の両方を指定している
* `addTag` で空白を含むタグを指定している

---

## 22. 将来検討事項

以下は将来検討事項です。すぐに標準化しないでください。

* `splitNode`
* `mergeNodes`
* `renumberSubtree`
* `bulkUpdate`
* `rollback`
* `undo`
* `approvalWorkflow`
* `baseline`
* `cost`
* `calendar`
* `criticalPath`
* `gantt`
* `earnedValue`
* `risk`
* `qualityGate`

これらは有用ですが、v0.1で入れすぎると仕様が重くなります。

---

## 23. 変更提案の書き方

AIエージェントが大きな仕様変更を提案する場合は、以下の形式で書いてください。

```markdown
## 提案: <変更名>

### 背景

なぜ必要か。

### 変更内容

何を変更するか。

### 影響範囲

どのファイル、Schema、サンプル、実装に影響するか。

### 後方互換性

破壊的変更かどうか。

### 代替案

他に考えた案。

### 推奨案

なぜこの案がよいか。

### 移行方法

既存データをどう移行するか。
```

---

## 24. 最重要ルール

AIエージェントは、次の原則を最優先してください。

```text
WBS-JSONは、人間が理解でき、AIが安全に編集でき、ツール間で交換できる仕様でなければならない。
```

そのため、以下を常に守ってください。

* 仕様を過度に複雑にしない
* 既存データを不用意に壊さない
* JSON Schemaと仕様本文を同期する
* AIが誤って全体を書き換える設計を避ける
* WBSの分解構造と依存関係を混同しない
* 成果物、作業、リソース、関係を分離する
* 独自拡張は `extensions` に閉じ込める
* 例とテストを必ず更新する

---

## 25. 推奨するAI作業スタイル

AIエージェントは、作業時に以下の順番で考えてください。

```text
1. これは仕様本文の変更か？
2. JSON Schemaの変更も必要か？
3. サンプルの変更も必要か？
4. valid/invalidテストの追加が必要か？
5. 後方互換性は壊れるか？
6. AIが安全に差分編集できるか？
7. 人間がレビューしやすいか？
```

迷った場合は、仕様を増やすより、まず `specification/validation-rules.md` や `extensions` で扱うことを優先してください。
