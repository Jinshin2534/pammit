# スタックの出力値を読む共通処理
set -euo pipefail
export AWS_DEFAULT_REGION=ap-northeast-1
STACK=Pammit
output() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
# EC2 上でコマンドを実行し、終わるまで待って標準出力を表示する
run_on_server() {
  local instance cmd_id status
  instance=$(output InstanceId)
  cmd_id=$(aws ssm send-command --instance-ids "$instance" --document-name AWS-RunShellScript \
    --parameters "$(jq -n --arg c "$1" '{commands: [$c]}')" --query Command.CommandId --output text)
  while true; do
    status=$(aws ssm get-command-invocation --command-id "$cmd_id" --instance-id "$instance" \
      --query Status --output text 2>/dev/null || echo Pending)
    case "$status" in Pending|InProgress|Delayed) sleep 3 ;; *) break ;; esac
  done
  aws ssm get-command-invocation --command-id "$cmd_id" --instance-id "$instance" \
    --query '[StandardOutputContent,StandardErrorContent]' --output text
  [ "$status" = Success ]
}
