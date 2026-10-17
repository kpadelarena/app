import type { Metadata } from "next";
import { LegalPage, Section, listStyle } from "@/components/legal/LegalPage";
import { CLUB_NAME, CONTACT_EMAIL } from "@/features/club/constants";

export const metadata: Metadata = { title: `이용약관 · ${CLUB_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage title="이용약관">
      <p>
        이 약관은 {CLUB_NAME}(이하 &quot;클럽&quot;)이 제공하는 코트 예약 · 리그 관리 서비스(이하 &quot;서비스&quot;)의
        이용 조건을 정합니다. 회원가입을 하면 이 약관에 동의한 것으로 봅니다.
      </p>

      <Section title="1. 서비스 내용">
        <p>
          서비스는 클럽 회원이 지점별 코트 예약 현황을 보고 예약에 참여하며, 리그 이벤트의 참가자 · 대진표 · 순위를
          관리할 수 있도록 돕는 도구입니다. 서비스는 코트 이용료나 참가비를 결제하는 기능을 제공하지 않으며, 비용은
          클럽과 별도로 정산합니다.
        </p>
      </Section>

      <Section title="2. 회원 계정">
        <ul style={listStyle}>
          <li>회원가입에는 이메일 주소 또는 Google 계정이 필요합니다. 계정은 본인만 사용해야 합니다.</li>
          <li>이름, 레벨 등 프로필 정보는 사실에 맞게 입력하고, 바뀌면 직접 수정합니다.</li>
          <li>운영자는 클럽 운영을 위해 회원에게 관리자 권한을 부여하거나 회수할 수 있습니다.</li>
          <li>
            계정 삭제는 언제든{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "inherit" }}>
              {CONTACT_EMAIL}
            </a>
            로 요청할 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="3. 코트 예약">
        <ul style={listStyle}>
          <li>예약은 지점별 운영 시간 안에서 시간 단위로 할 수 있으며, 코트당 최대 인원은 지점마다 정해집니다.</li>
          <li>
            공개 예약에는 누구나 참여할 수 있고, 비공개 예약에는 참여자가 추가한 사람만 참여합니다. 참여자는 클럽 회원이
            아닌 게스트를 이름으로 추가할 수 있습니다.
          </li>
          <li>
            예약 참여와 취소는 시작 24시간 전까지 회원이 직접 할 수 있습니다. 그 이후의 변경은 운영자나 관리자에게
            요청해야 합니다.
          </li>
          <li>마지막 참여자가 빠지면 예약은 자동으로 취소됩니다.</li>
          <li>운영자와 관리자는 클럽 운영을 위해 예약을 조정하거나 취소할 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="4. 리그">
        <ul style={listStyle}>
          <li>리그 이벤트의 참가자 등록, 대진표 생성, 결과 사진 등록은 운영자와 관리자가 합니다.</li>
          <li>경기 점수는 해당 경기의 참가자나 관리자가 입력하며, 잘못 입력된 점수는 관리자가 바로잡습니다.</li>
          <li>경기 기록과 순위는 클럽의 기록으로 보존됩니다.</li>
        </ul>
      </Section>

      <Section title="5. 이용자의 책임">
        <ul style={listStyle}>
          <li>타인의 계정을 사용하거나, 타인의 정보를 무단으로 입력하지 않습니다.</li>
          <li>참여하지 않을 예약을 반복적으로 잡거나 취소하는 등 다른 회원의 이용을 방해하지 않습니다.</li>
          <li>위반이 반복되면 운영자는 이용을 제한하거나 계정을 정지할 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="6. 책임의 한계">
        <p>
          클럽은 서비스를 현재 상태 그대로 제공하며, 시설 사정이나 시스템 장애로 예약이 이행되지 못할 수 있습니다. 이
          경우 클럽은 가능한 범위에서 대체 일정을 안내하지만, 서비스 이용과 관련해 발생한 간접적 손해에 대해서는 책임을
          지지 않습니다. 코트 이용 중의 안전은 이용자 본인이 주의합니다.
        </p>
      </Section>

      <Section title="7. 약관의 변경">
        <p>
          약관이 바뀌면 시행일 7일 전부터 서비스 안에 공지합니다. 변경된 약관에 동의하지 않는 회원은 계정 삭제를 요청할
          수 있습니다.
        </p>
      </Section>

      <Section title="8. 준거법과 분쟁">
        <p>이 약관은 대한민국 법률에 따르며, 분쟁은 먼저 클럽과 회원이 성실히 협의해 해결합니다.</p>
      </Section>
    </LegalPage>
  );
}
