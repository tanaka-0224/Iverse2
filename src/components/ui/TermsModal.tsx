import { X } from 'lucide-react';
import Button from './Button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export default function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  if (!isOpen) return null;

  const title = type === 'terms' ? '利用規約' : 'プライバシーポリシー';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            aria-label="閉じる"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6 text-gray-700 leading-relaxed">
            {type === 'terms' ? (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第1条（適用）</h3>
                  <p>
                    本規約は、当社が提供するサービス「Iverse」（以下「本サービス」といいます）の利用条件を定めるものです。
                    登録ユーザーの皆さま（以下「ユーザー」といいます）には、本規約に従って、本サービスをご利用いただきます。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第2条（利用登録）</h3>
                  <p>
                    本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、
                    当社がこれを承認することによって、利用登録が完了するものとします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第3条（ユーザーIDおよびパスワードの管理）</h3>
                  <p>
                    ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。
                    ユーザーIDまたはパスワードが第三者に使用されたことによって生じた損害は、当社に故意または重大な過失がある場合を除き、
                    当社は一切の責任を負わないものとします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第4条（禁止事項）</h3>
                  <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>法令または公序良俗に違反する行為</li>
                    <li>犯罪行為に関連する行為</li>
                    <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                    <li>当社、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                    <li>本サービスによって得られた情報を商業的に利用する行為</li>
                    <li>当社のサービスの運営を妨害するおそれのある行為</li>
                    <li>不正アクセス、不正な方法による情報の取得を試みる行為</li>
                    <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                    <li>不正な目的を持って本サービスを利用する行為</li>
                    <li>本サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為</li>
                    <li>その他、当社が不適切と判断する行為</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第5条（本サービスの提供の停止等）</h3>
                  <p>
                    当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                    <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                    <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                    <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第6条（保証の否認および免責）</h3>
                  <p>
                    当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、
                    セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第7条（サービス内容の変更等）</h3>
                  <p>
                    当社は、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、
                    ユーザーはこれに同意するものとします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第8条（利用規約の変更）</h3>
                  <p>
                    当社は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
                    本規約の変更は、変更後の本規約の効力発生時点から適用されるものとします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第9条（個人情報の取扱い）</h3>
                  <p>
                    当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第10条（通知または連絡）</h3>
                  <p>
                    ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
                    当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、
                    現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第11条（権利義務の譲渡の禁止）</h3>
                  <p>
                    ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、
                    または担保に供することはできません。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">第12条（準拠法・裁判管轄）</h3>
                  <p>
                    本規約の解釈にあたっては、日本法を準拠法とします。
                    本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
                  </p>
                </div>

                <div className="text-sm text-gray-500 pt-4">
                  <p>制定日：2024年1月1日</p>
                  <p>最終改定日：2024年12月1日</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">1. はじめに</h3>
                  <p>
                    当社（以下「当社」といいます）は、本ウェブサイト上で提供するサービス「Iverse」（以下「本サービス」といいます）における、
                    ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">2. 収集する情報</h3>
                  <p>当社は、本サービスの提供にあたり、以下の情報を収集する場合があります。</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>アカウント情報：</strong>メールアドレス、パスワード、表示名</li>
                    <li><strong>プロフィール情報：</strong>スキル、目的、アバター画像</li>
                    <li><strong>利用情報：</strong>サービス利用履歴、投稿内容、マッチング情報</li>
                    <li><strong>技術情報：</strong>IPアドレス、ブラウザ情報、デバイス情報</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">3. 情報の利用目的</h3>
                  <p>当社は、収集した情報を以下の目的で利用します。</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>本サービスの提供、運営、改善</li>
                    <li>ユーザーへの通知、連絡</li>
                    <li>マッチング機能の提供</li>
                    <li>不正利用の防止、セキュリティ対策</li>
                    <li>利用統計の作成、分析</li>
                    <li>新機能の開発、改善</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">4. 情報の管理</h3>
                  <p>
                    当社は、ユーザーの個人情報を正確かつ最新の状態に保ち、個人情報への不正アクセス・紛失・破壊・改ざん・漏洩などを防止するため、
                    セキュリティシステムの維持・管理体制の整備・社員教育の徹底等の必要な措置を講じ、安全対策を実施し個人情報の厳重な管理を行います。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">5. 情報の開示・共有</h3>
                  <p>
                    当社は、ユーザー本人の同意がある場合、または法令に基づき開示が必要な場合を除き、
                    ユーザーの個人情報を第三者に開示・提供することはありません。
                    ただし、以下の場合はこの限りではありません。
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>本サービスの利用により、他のユーザーに対して公開される情報（プロフィール情報、投稿内容など）</li>
                    <li>マッチング成立時、マッチング相手に対して必要な情報を開示する場合</li>
                    <li>法令に基づく開示が必要な場合</li>
                    <li>人の生命、身体または財産の保護のために必要がある場合</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">6. 情報の保存期間</h3>
                  <p>
                    当社は、ユーザーが本サービスを利用している間、個人情報を保存します。
                    アカウント削除後は、法令で定められた保存期間を除き、速やかに個人情報を削除します。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">7. Cookie（クッキー）の使用</h3>
                  <p>
                    本サービスでは、ユーザーの利便性向上のため、Cookieを使用する場合があります。
                    Cookieは、ユーザーのブラウザに保存される小さなテキストファイルです。
                    ユーザーはブラウザの設定により、Cookieの受け入れを拒否することができます。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">8. ユーザーの権利</h3>
                  <p>ユーザーは、以下の権利を有します。</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>自己の個人情報の開示を請求する権利</li>
                    <li>自己の個人情報の訂正、追加または削除を請求する権利</li>
                    <li>自己の個人情報の利用停止または消去を請求する権利</li>
                  </ul>
                  <p>
                    これらの権利を行使する場合は、お問い合わせフォームよりご連絡ください。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">9. プライバシーポリシーの変更</h3>
                  <p>
                    当社は、必要に応じて、本ポリシーの内容を変更することがあります。
                    変更後のプライバシーポリシーは、本ウェブサイトに掲載した時点で効力を生じるものとします。
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900">10. お問い合わせ窓口</h3>
                  <p>
                    本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold">Iverse 運営チーム</p>
                    <p className="text-sm text-gray-600">Email: support@iverse.example.com</p>
                  </div>
                </div>

                <div className="text-sm text-gray-500 pt-4">
                  <p>制定日：2024年1月1日</p>
                  <p>最終改定日：2024年12月1日</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-300/50 px-6 py-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
          <Button 
            onClick={onClose} 
            className="w-full" 
            size="lg"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
