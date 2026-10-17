import type { Metadata } from "next";
import { LegalPage, Section, listStyle } from "@/components/legal/LegalPage";
import { CLUB_NAME, CONTACT_EMAIL } from "@/features/club/constants";

export const metadata: Metadata = { title: `개인정보처리방침 · ${CLUB_NAME}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침">
      <p>
        {CLUB_NAME}(이하 &quot;클럽&quot;)은 회원의 개인정보를 소중히 다루며, 「개인정보 보호법」에 따라 아래와 같이
        개인정보를 처리합니다. 이 방침은 클럽이 운영하는 코트 예약 · 리그 관리 서비스(이하 &quot;서비스&quot;)에
        적용됩니다.
      </p>

      <Section title="1. 수집하는 개인정보와 수집 방법">
        <ul style={listStyle}>
          <li>
            <strong>회원가입 시</strong>: 이메일 주소, 비밀번호(암호화 저장), 이름 또는 닉네임, 실력 레벨, 연락처(선택),
            프로필 사진(선택)
          </li>
          <li>
            <strong>Google 계정으로 가입 시</strong>: Google이 제공하는 이메일 주소, 이름, 프로필 사진. 비밀번호는 받지
            않습니다.
          </li>
          <li>
            <strong>서비스 이용 중</strong>: 코트 예약 내역, 리그 참가 및 경기 결과, 접속 기록(IP 주소, 접속 일시)
          </li>
        </ul>
      </Section>

      <Section title="2. 이용 목적">
        <ul style={listStyle}>
          <li>회원 식별과 로그인, 비밀번호 재설정 등 계정 관리</li>
          <li>코트 예약, 참가자 관리, 리그 대진 및 순위 운영</li>
          <li>예약 변경이나 리그 일정 등 운영상 연락(연락처는 운영자와 관리자만 볼 수 있습니다)</li>
          <li>서비스 안정성 확보와 부정 이용 방지</li>
        </ul>
      </Section>

      <Section title="3. 보유 및 이용 기간">
        <p>
          회원 탈퇴 시 지체 없이 파기합니다. 다만 리그 경기 기록과 순위는 이름만 남긴 채 보존될 수 있으며, 관계 법령에
          따라 보존이 필요한 정보(접속 기록 3개월 등)는 해당 기간 동안 보관합니다.
        </p>
      </Section>

      <Section title="4. 제3자 제공 및 처리 위탁">
        <p>
          클럽은 개인정보를 제3자에게 판매하거나 제공하지 않습니다. 서비스 운영을 위해 아래 업체에 처리를 위탁합니다.
        </p>
        <ul style={listStyle}>
          <li>Supabase, Inc. — 데이터베이스, 인증, 파일 저장(서버 위치: 대한민국 서울)</li>
          <li>Vercel, Inc. — 웹 애플리케이션 호스팅</li>
          <li>Google LLC — Google 계정 로그인(선택한 경우)</li>
        </ul>
      </Section>

      <Section title="5. 회원의 권리">
        <p>
          회원은 언제든지 자신의 개인정보를 열람, 정정, 삭제하거나 처리 정지를 요구할 수 있습니다. 프로필과 연락처는
          서비스 안에서 직접 수정할 수 있고, 계정 삭제는 아래 연락처로 요청하면 지체 없이 처리합니다.
        </p>
      </Section>

      <Section title="6. 안전성 확보 조치">
        <ul style={listStyle}>
          <li>비밀번호는 복호화할 수 없는 방식으로 암호화해 저장합니다.</li>
          <li>모든 통신은 HTTPS로 암호화됩니다.</li>
          <li>연락처 등 민감한 정보는 본인과 운영자, 관리자만 접근할 수 있도록 데이터베이스 수준에서 제한합니다.</li>
        </ul>
      </Section>

      <Section title="7. 쿠키와 자동 수집">
        <p>
          서비스는 로그인 상태 유지를 위해 브라우저 저장소를 사용합니다. 광고나 행동 추적 목적의 쿠키는 사용하지
          않습니다.
        </p>
      </Section>

      <Section title="8. 개인정보 보호책임자">
        <p>
          개인정보 관련 문의, 열람 · 삭제 요청은 {CLUB_NAME} 운영자에게 이메일(
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "inherit" }}>
            {CONTACT_EMAIL}
          </a>
          )로 연락해 주세요.
        </p>
      </Section>

      <Section title="9. 방침의 변경">
        <p>이 방침이 바뀌면 시행일 7일 전부터 서비스 안에 공지합니다. 시행일은 이 페이지 상단에 표시합니다.</p>
      </Section>
    </LegalPage>
  );
}
